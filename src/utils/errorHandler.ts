import { Request, Response, NextFunction } from "express";
import { logError } from "./errorLogger";

export const errorHandler = async (err: any, req: Request, res: Response) => {
  await logError(err, req, "errorHandler");

  const status = err.status || 500;
  const message =
    err.message || "Something went wrong, please try again later.";
  res.status(status).json({
    status,
    message,
  });
};



