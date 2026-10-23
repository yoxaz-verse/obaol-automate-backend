import { Request } from "express";

const REDACTED_FIELDS = new Set(["password", "token", "authorization", "cookie", "secret", "otp", "code"]);
const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, REDACTED_FIELDS.has(key.toLowerCase()) ? "[REDACTED]" : sanitize(entry)]));
};

export const logError = async (error: unknown, req: Request, context: string) => {
  const candidate = error instanceof Error ? error : new Error("Unknown error");
  console.error(`[${new Date().toISOString()}] [${context}]`, {
    requestId: req.requestId,
    actorId: req.user?.id || req.admin?.id || null,
    message: candidate.message,
    stack: process.env.NODE_ENV === "production" ? undefined : candidate.stack,
    url: req.originalUrl,
    method: req.method,
    body: sanitize(req.body),
    params: sanitize(req.params),
    query: sanitize(req.query),
  });
  // Optionally, integrate with a logging service like Winston or Loggly
};
