// src/controllers/fileController.ts

import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import path from "path";
import envVars from "../config/validateEnv"; // Ensure envVars is correctly imported
import FileService from "../services/file";

class FileController {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  // Handle File Upload (Single and Multiple)
  public upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.file) {
        // Single file upload
        const newFile = await this.fileService.uploadSingleFile(req);

        // Construct base URL dynamically
        const baseURL = `${req.protocol}://${req.get("host")}`;

        // Ensure forward slashes in URL and include full relative path
        const relativePath = path
          .relative(envVars.UPLOAD_DIR, newFile[0].path)
          .split(path.sep)
          .join("/");
        const fileURL = `${baseURL}/uploads/${relativePath}`;

        return res.status(201).json({
          message: "File uploaded successfully.",
          fileId: newFile[0]._id,
          filePath: newFile[0].path,
          fileURL: fileURL,
        });
      } else if (req.files && Array.isArray(req.files)) {
        // Multiple files upload
        const newFiles = await this.fileService.uploadMultipleFiles(req);

        // Construct base URL dynamically
        const baseURL = `${req.protocol}://${req.get("host")}`;

        // Ensure forward slashes in URLs and include full relative path
        const fileURLs = newFiles.map((file) => {
          const relativePath = path
            .relative(envVars.UPLOAD_DIR, file.path)
            .split(path.sep)
            .join("/");
          return `${baseURL}/uploads/${relativePath}`;
        });

        const fileIds = newFiles.map((file) => file._id);
        const filePaths = newFiles.map((file) => file.path);

        return res.status(201).json({
          message: "Files uploaded successfully.",
          fileIds,
          filePaths,
          fileURLs,
        });
      } else {
        return res.status(400).json({ message: "No files uploaded." });
      }
    } catch (error: any) {
      logger.error("File Upload Error:", { error: error.message });
      res
        .status(500)
        .json({ message: "Internal Server Error.", error: error.message });
    }
  };

  // Handle File Update
  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updatedFile = await this.fileService.updateFile(id, req);

      if (!updatedFile) {
        logger.warn("File not found for update.", { fileId: id });
        return res.status(404).json({ message: "File not found." });
      }

      // Construct base URL dynamically
      const baseURL = `${req.protocol}://${req.get("host")}`;
      const relativePath = path
        .relative(envVars.UPLOAD_DIR, updatedFile.path)
        .split(path.sep)
        .join("/");
      const fileURL = `${baseURL}/uploads/${relativePath}`;

      return res.status(200).json({
        message: "File updated successfully.",
        file: updatedFile,
        fileURL: fileURL,
      });
    } catch (error: any) {
      logger.error("File Update Error:", { error: error.message });
      res
        .status(500)
        .json({ message: "Internal Server Error.", error: error.message });
    }
  };

  // Handle File Deletion
  public delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.fileService.deleteFile(id);

      return res.status(200).json({ message: "File deleted successfully." });
    } catch (error: any) {
      logger.error("File Deletion Error:", { error: error.message });
      if (error.message === "File not found.") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Internal Server Error.", error: error.message });
    }
  };
}

export default new FileController();
