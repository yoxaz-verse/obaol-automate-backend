import winston from "winston";
import fs from "fs";
import path from "path";

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

// Define the log format
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logDir = resolveLogDir();
const fileTransports = logDir
  ? [new winston.transports.File({ filename: path.join(logDir, "api.log") })]
  : [];

// Create a winston logger
const logger = winston.createLogger({
  level: "info", // Default log level
  format: winston.format.combine(
    winston.format.timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(), // Log to the console
    ...fileTransports, // Log to file when writable
  ],
});

export default logger;
