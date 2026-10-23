export type ErrorDetails = Record<string, string | string[]>;

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors?: ErrorDetails;
  readonly operational: boolean;

  constructor(message: string, options: { statusCode?: number; code?: string; errors?: ErrorDetails; cause?: unknown } = {}) {
    super(message);
    if (options.cause !== undefined) (this as Error & { cause?: unknown }).cause = options.cause;
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.errors = options.errors;
    this.operational = this.statusCode < 500;
  }
}

export const badRequest = (message: string, errors?: ErrorDetails) => new AppError(message, { statusCode: 400, code: "VALIDATION_ERROR", errors });
export const forbidden = (message = "Access denied.") => new AppError(message, { statusCode: 403, code: "FORBIDDEN" });
export const notFound = (message = "Resource not found.") => new AppError(message, { statusCode: 404, code: "NOT_FOUND" });
export const conflict = (message: string) => new AppError(message, { statusCode: 409, code: "CONFLICT" });
