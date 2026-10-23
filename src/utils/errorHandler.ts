import { Request, Response, NextFunction } from "express";
import { logError } from "./errorLogger";
import { AppError, ErrorDetails } from "../core/errors/AppError";

type ErrorCandidate = Error & { code?: string | number; status?: number; statusCode?: number; errors?: Record<string, { message?: string } | string> };
const toErrorCandidate = (value: unknown): ErrorCandidate => {
  if (value instanceof Error) return value as ErrorCandidate;
  if (typeof value === "object" && value !== null) {
    const source = value as Record<string, unknown>;
    const error = new Error(typeof source.message === "string" ? source.message : "Unknown error") as ErrorCandidate;
    if (typeof source.code === "string" || typeof source.code === "number") error.code = source.code;
    if (typeof source.status === "number") error.status = source.status;
    if (typeof source.statusCode === "number") error.statusCode = source.statusCode;
    if (typeof source.name === "string") error.name = source.name;
    if (typeof source.errors === "object" && source.errors !== null) error.errors = source.errors as ErrorCandidate["errors"];
    return error;
  }
  return new Error("Unknown error") as ErrorCandidate;
};

const validationDetails = (error: ErrorCandidate): ErrorDetails | undefined => {
  if (error.name !== "ValidationError" || !error.errors) return undefined;
  return Object.fromEntries(Object.entries(error.errors).map(([field, detail]) => [field, typeof detail === "string" ? detail : detail.message || "Invalid value."]));
};

export const errorHandler = async (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  await logError(err, req, "errorHandler");
  const error = toErrorCandidate(err);

  if (Number(error.code) === 11000) {
    const indexName = String(error.message || "").match(/index:\s+([^\s]+)/)?.[1] || "";
    const isLegacyLabCompanyIndex = req.originalUrl.includes("/lab-profiles/") && indexName === "companyId_1";
    return res.status(isLegacyLabCompanyIndex ? 503 : 409).json({
      success: false,
      status: isLegacyLabCompanyIndex ? 503 : 409,
      code: isLegacyLabCompanyIndex ? "LAB_PROFILE_INDEX_MIGRATION_REQUIRED" : "DUPLICATE_RESOURCE",
      message: isLegacyLabCompanyIndex
        ? "Laboratory profiles are temporarily unavailable while a database update is completed. Your entered details are still on this page; please try again shortly."
        : "A record with these details already exists.",
      requestId: req.requestId,
    });
  }

  const details = validationDetails(error);
  const status = details ? 400 : Number(error.statusCode || error.status || 500);
  const appError = error instanceof AppError ? error : null;
  const legacyCode = typeof error.code === "string" ? error.code : undefined;
  const message = status >= 500 && process.env.NODE_ENV === "production" ? "Something went wrong. Please try again later." : error.message || "Something went wrong. Please try again later.";
  res.status(status).json({
    success: false,
    status,
    code: appError?.code || legacyCode || (details ? "VALIDATION_ERROR" : status === 409 ? "CONFLICT" : "INTERNAL_ERROR"),
    message,
    ...(appError?.errors || details ? { errors: appError?.errors || details } : {}),
    requestId: req.requestId,
  });
};



