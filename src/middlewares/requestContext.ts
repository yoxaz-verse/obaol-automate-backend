import { randomUUID } from "crypto";
import type { RequestHandler } from "express";

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._-]{8,128}$/;

export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = String(req.header("x-request-id") || "").trim();
  req.requestId = REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};
