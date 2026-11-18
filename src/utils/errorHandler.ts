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
  const safeOperationalMessages: Record<string, string> = {
    S3_NOT_CONFIGURED: "Private file storage is not configured. Ask an administrator to configure the AWS S3 bucket and region before uploading a signature.",
    S3_ACCESS_DENIED: "AWS denied access to the private storage bucket. Ask an administrator to check the application's S3 IAM permissions.",
    S3_KMS_DENIED: "AWS denied access to the bucket encryption key. Ask an administrator to grant KMS encrypt and decrypt permissions.",
    S3_REGION_MISMATCH: "The configured AWS region does not match the private storage bucket region.",
    S3_CREDENTIALS_INVALID: "The backend AWS credentials are invalid or expired.",
    S3_BUCKET_NOT_FOUND: "The configured private storage bucket was not found.",
    S3_NETWORK_ERROR: "The backend could not reach AWS private storage. Please retry shortly.",
    S3_WRITE_FAILED: "The signature could not be written to private storage.",
    S3_ENCRYPTION_INVALID: "The backend private-storage encryption setting is invalid.",
    SIGNATURE_IMAGE_INVALID: "Upload a valid transparent PNG signature.",
    SIGNATURE_NORMALIZATION_FAILED: "The PNG could not be processed. Export it again as a non-animated transparent PNG.",
    SIGNATURE_STORAGE_VERIFY_FAILED: "The signature reached private storage, but the read-back verification failed. Ask an administrator to run the signature storage check.",
    SIGNATURE_RECORD_FAILED: "The signature file was verified, but its database record could not be saved.",
  };
  const safeOperationalMessage = legacyCode ? safeOperationalMessages[legacyCode] : undefined;
  const message = safeOperationalMessage || (status >= 500 && process.env.NODE_ENV === "production" ? "Something went wrong. Please try again later." : error.message || "Something went wrong. Please try again later.");
  res.status(status).json({
    success: false,
    status,
    code: appError?.code || legacyCode || (details ? "VALIDATION_ERROR" : status === 409 ? "CONFLICT" : "INTERNAL_ERROR"),
    message,
    ...(appError?.errors || details ? { errors: appError?.errors || details } : {}),
    requestId: req.requestId,
  });
};



