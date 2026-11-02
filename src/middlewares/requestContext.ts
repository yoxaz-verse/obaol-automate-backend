import { randomUUID } from "crypto";
import type { RequestHandler } from "express";

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._-]{8,128}$/;

export const requestContext: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const incoming = String(req.header("x-request-id") || "").trim();
  req.requestId = REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  const writeHead = res.writeHead.bind(res);
  res.writeHead = ((...args: Parameters<typeof res.writeHead>) => {
    if (!res.headersSent) {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      res.setHeader("Server-Timing", `app;dur=${elapsedMs.toFixed(1)}`);
    }
    return writeHead(...args);
  }) as typeof res.writeHead;
  next();
};
