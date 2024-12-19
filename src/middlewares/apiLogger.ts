import logger from "../utils/apiLogger";
import { Request, Response, NextFunction } from "express";

const apiLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logDetails = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ip: req.ip,
      responseTime: `${duration}ms`,
      userAgent: req.headers["user-agent"] || "unknown",
    };

    logger.info(JSON.stringify(logDetails));
  });

  next();
};

export default apiLogger;
