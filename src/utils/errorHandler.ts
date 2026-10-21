import { Request, Response, NextFunction } from "express";
import { logError } from "./errorLogger";

export const errorHandler = async (err: any, req: Request, res: Response, _next: NextFunction) => {
  await logError(err, req, "errorHandler");

  if (Number(err?.code) === 11000) {
    const indexName = String(err?.message || "").match(/index:\s+([^\s]+)/)?.[1] || "";
    const isLegacyLabCompanyIndex = req.originalUrl.includes("/lab-profiles/") && indexName === "companyId_1";
    return res.status(isLegacyLabCompanyIndex ? 503 : 409).json({
      success: false,
      status: isLegacyLabCompanyIndex ? 503 : 409,
      code: isLegacyLabCompanyIndex ? "LAB_PROFILE_INDEX_MIGRATION_REQUIRED" : "DUPLICATE_RESOURCE",
      message: isLegacyLabCompanyIndex
        ? "Laboratory profiles are temporarily unavailable while a database update is completed. Your entered details are still on this page; please try again shortly."
        : "A record with these details already exists.",
    });
  }

  const status = Number(err.statusCode || err.status || 500);
  const message =
    err.message || "Something went wrong, please try again later.";
  res.status(status).json({
    success: false,
    status,
    code: err.code || (status === 409 ? "CONFLICT" : "INTERNAL_ERROR"),
    message,
  });
};



