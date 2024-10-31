// src/middlewares/fileValidation.ts

import { Request, Response, NextFunction } from "express";

class FileValidationMiddleware {
  /**
   * Validates single file uploads.
   */
  public validateUpload(req: Request, res: Response, next: NextFunction) {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Additional validations can be added here if needed

    next();
  }

  /**
   * Validates multiple file uploads.
   */
  public validateUploadMultiple(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    // Additional validations can be added here if needed

    next();
  }
}

export default FileValidationMiddleware;
