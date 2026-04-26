// src/utils/logger.ts

import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

const { combine, timestamp, printf, colorize } = format;

const resolveLogDir = () => {
  const preferredDir = process.env.LOG_DIR || "logs";
  const absoluteDir = path.isAbsolute(preferredDir)
    ? preferredDir
    : path.join(process.cwd(), preferredDir);

  try {
    fs.mkdirSync(absoluteDir, { recursive: true });
    return absoluteDir;
  } catch {
    return null;
  }
};

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ""
  }`;
});

const logDir = resolveLogDir();
const fileTransports = logDir
  ? [new transports.File({ filename: path.join(logDir, "app.log") })]
  : [];
const exceptionHandlers = logDir
  ? [new transports.File({ filename: path.join(logDir, "exceptions.log") })]
  : [new transports.Console()];
const rejectionHandlers = logDir
  ? [new transports.File({ filename: path.join(logDir, "rejections.log") })]
  : [new transports.Console()];

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),
    ...fileTransports,
  ],
  exceptionHandlers,
  rejectionHandlers,
});

export default logger;
