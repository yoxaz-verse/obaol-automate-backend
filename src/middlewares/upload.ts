// src/middlewares/upload.ts

import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import sanitize from "sanitize-filename";
import logger from "../utils/logger";
import envVars from "../config/validateEnv";

// Define storage configuration with dynamic destination
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const entities = req.body.entities;
      let parsedEntities = entities;

      // Parse entities if sent as JSON string
      if (typeof entities === "string") {
        parsedEntities = JSON.parse(entities);
      }

      if (
        !parsedEntities ||
        !Array.isArray(parsedEntities) ||
        parsedEntities.length === 0
      ) {
        throw new Error("Entities array is required.");
      }

      // Build folder path
      const sanitizedEntities = parsedEntities.map((ent: any) => {
        if (!ent.entity || !ent.entityId) {
          throw new Error("Each entity must have 'entity' and 'entityId'.");
        }
        return `${sanitize(ent.entity)}-${sanitize(ent.entityId)}`;
      });

      const folderPath = path.join(...sanitizedEntities);
      const uploadDir = envVars.UPLOAD_DIR || "uploads";
      const uploadPath = path.join(__dirname, `../../${uploadDir}`, folderPath);

      // Create the directory if it doesn't exist
      fs.mkdir(uploadPath, { recursive: true }, (err) => {
        if (err) {
          logger.error("Error creating upload directory.", {
            error: err.message,
          });
          cb(err, "");
        } else {
          logger.info("Setting dynamic upload destination.", { uploadPath });
          cb(null, uploadPath);
        }
      });
    } catch (error: any) {
      logger.error("Error setting upload destination.", {
        error: error.message,
      });
      cb(error, "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedFileName = file.originalname.replace(
      /[^a-zA-Z0-9.\-_]/g,
      ""
    );
    cb(null, `${uniqueSuffix}-${sanitizedFileName}`);
    logger.info("Generating unique filename.", {
      filename: `${uniqueSuffix}-${sanitizedFileName}`,
    });
  },
});

// File filter to validate file types
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "image/gif",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn("Invalid file type attempted.", { mimetype: file.mimetype });
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
  }
};

// Initialize Multer
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

export default upload;
