import { Request } from "express";

const REDACTED_FIELDS = new Set(["password", "token", "authorization", "cookie", "secret", "otp", "code"]);
const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, REDACTED_FIELDS.has(key.toLowerCase()) ? "[REDACTED]" : sanitize(entry)]));
};

export const logError = async (error: unknown, req: Request, context: string) => {
  const candidate: any = error instanceof Error ? error : new Error("Unknown error");
  const cause: any = candidate.cause;
  console.error(`[${new Date().toISOString()}] [${context}]`, {
    requestId: req.requestId,
    actorId: req.user?.id || req.admin?.id || null,
    message: candidate.message,
    code: candidate.code || null,
    storageDiagnostic: sanitize(candidate.storageDiagnostic || null),
    cause: cause ? {
      name: String(cause.name || cause.Code || "UnknownError"),
      message: String(cause.message || "Unknown storage error"),
      httpStatusCode: Number(cause?.$metadata?.httpStatusCode || 0) || null,
      providerRequestId: String(cause?.$metadata?.requestId || "") || null,
      providerExtendedRequestId: String(cause?.$metadata?.extendedRequestId || "") || null,
    } : null,
    stack: process.env.NODE_ENV === "production" ? undefined : candidate.stack,
    url: req.originalUrl,
    method: req.method,
    body: sanitize(req.body),
    params: sanitize(req.params),
    query: sanitize(req.query),
  });
  // Optionally, integrate with a logging service like Winston or Loggly
};
