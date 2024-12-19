// src/controllers/fileController.ts
import FileService from "../services/file";
import { Request, Response } from "express";

class FileController {
  private fileService = new FileService();

  /**
   * Create a new file entry
   */
  public createFile = async (req: Request, res: Response) => {
    try {
      const { imageName, mimeType, size, path, url } = req.body;
      const file = await this.fileService.createFile({
        imageName,
        mimeType,
        size,
        path,
        url,
      });
      res.status(201).json({ message: "File created successfully", file });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get a file by ID
   */
  public getFileById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = await this.fileService.getFileById(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.status(200).json({ file });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get all files
   */
  public getAllFiles = async (_req: Request, res: Response) => {
    try {
      const files = await this.fileService.getAllFiles();
      res.status(200).json({ files });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Update a file entry
   */
  public updateFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedFile = await this.fileService.updateFile(id, updates);
      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }
      res
        .status(200)
        .json({ message: "File updated successfully", file: updatedFile });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Delete a file entry
   */
  public deleteFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedFile = await this.fileService.deleteFile(id);
      if (!deletedFile) {
        return res.status(404).json({ message: "File not found" });
      }
      res.status(200).json({ message: "File deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Handle bulk file uploads
   */
  public uploadBulkFiles = async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[]; // Assuming multer handles the file upload
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded." });
      }

      // Prepare file metadata for saving
      const fileData = files.map((file) => ({
        imageName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`, // Dynamically generate URL
      }));

      const uploadedFiles = await this.fileService.createFiles(fileData);

      res.status(201).json({
        message: "Files uploaded successfully.",
        files: uploadedFiles,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Handle bulk file deletion
   */
  public deleteBulkFiles = async (req: Request, res: Response) => {
    try {
      const { fileIds } = req.body;
      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ message: "No file IDs provided." });
      }

      const deletedCount = await this.fileService.deleteFiles(fileIds);

      res.status(200).json({
        message: `${deletedCount} files deleted successfully.`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export default new FileController();
