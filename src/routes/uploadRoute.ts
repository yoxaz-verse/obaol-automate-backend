// src/routes/uploadRoute.ts

import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { IFile } from "../interfaces/file";
import FileService from "../services/file";
import FileValidationMiddleware from "../middlewares/file";
import logger from "../utils/logger";
import authenticateToken from "../middlewares/auth";
import uploadLimiter from "../middlewares/rateLimiter";

const uploadRouter = Router();
const fileService = new FileService();
const fileValidation = new FileValidationMiddleware();

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || "uploads";
    const uploadPath = path.join(__dirname, `../../${uploadDir}/`);
    cb(null, uploadPath);
    logger.info("Setting upload destination.", { uploadPath });
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
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
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

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

// Route: POST /api/v1/web/upload/single
uploadRouter.post(
  "/single",
  authenticateToken,
  uploadLimiter,
  upload.single("file"), // Must match frontend's field name
  fileValidation.validateUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newFile = await fileService.uploadSingleFile(req);

      if (!newFile || newFile.length === 0) {
        logger.warn("No file data returned from service.");
        return res.status(500).json({ message: "Failed to upload file." });
      }

      const fileId = newFile[0]._id;

      logger.info("File uploaded successfully.", {
        fileId,
        filePath: newFile[0].path,
      });

      res.status(201).json({
        message: "File uploaded successfully.",
        fileId,
        filePath: newFile[0].path,
        fileURL: `${process.env.BASE_URL}/uploads/${path.basename(
          newFile[0].path
        )}`,
      });
    } catch (error: any) {
      logger.error("File Upload Error:", { error: error.message });
      if (error instanceof multer.MulterError) {
        // Handle Multer-specific errors
        return res.status(400).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Internal Server Error.", error: error.message });
    }
  }
);

// Route: POST /api/v1/web/upload/multiple
uploadRouter.post(
  "/multiple",
  authenticateToken,
  uploadLimiter,
  upload.array("files", 10), // 'files' should match frontend's field name
  fileValidation.validateUploadMultiple,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newFiles = await fileService.uploadMultipleFiles(req);

      if (!newFiles || newFiles.length === 0) {
        logger.warn("No file data returned from service.");
        return res.status(500).json({ message: "Failed to upload files." });
      }

      const fileIds = newFiles.map((file: IFile) => file._id);

      logger.info("Multiple files uploaded successfully.", { fileIds });

      res.status(201).json({
        message: "Files uploaded successfully.",
        fileIds,
        filePaths: newFiles.map((file: IFile) => file.path),
        fileURLs: newFiles.map(
          (file: IFile) =>
            `${process.env.BASE_URL}/uploads/${path.basename(file.path)}`
        ),
      });
    } catch (error: any) {
      logger.error("Multiple File Upload Error:", { error: error.message });
      if (error instanceof multer.MulterError) {
        // Handle Multer-specific errors
        return res.status(400).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Internal Server Error.", error: error.message });
    }
  }
);

export default uploadRouter;
