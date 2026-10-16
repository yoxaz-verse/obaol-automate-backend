import { Request, Response, NextFunction } from "express";
import { logError } from "./errorLogger";

export const errorHandler = async (err: any, req: Request, res: Response, _next: NextFunction) => {
  await logError(err, req, "errorHandler");

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



