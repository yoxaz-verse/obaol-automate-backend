import { Request } from "express";

export const logError = async (error: any, req: Request, context: string) => {
  console.error(`[${new Date().toISOString()}] [${context}]`, {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });
  // Optionally, integrate with a logging service like Winston or Loggly
};
