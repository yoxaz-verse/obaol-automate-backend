// src/services/FileService.ts

import { Request } from "express";
import { IFile, ICreateFile } from "../interfaces/file";
import sanitize from "sanitize-filename";
import path from "path";
import fs from "fs/promises";
import logger from "../utils/logger";
import FileRepository from "../database/repositories/file";

class FileService {
  private fileRepository: FileRepository;

  constructor() {
    this.fileRepository = new FileRepository();
  }

  /**
   * Uploads a single file and saves its metadata.
   * @param req Express Request object
   * @returns Promise<IFile[]>
   */
  public async uploadSingleFile(req: Request): Promise<IFile[]> {
    const file = req.file;
    if (!file) {
      throw new Error("No file uploaded.");
    }

    const entities = req.body.entities;

    // Parse entities if sent as JSON string
    let parsedEntities = entities;
    if (typeof entities === "string") {
      try {
        parsedEntities = JSON.parse(entities);
      } catch (parseError) {
        throw new Error("Invalid entities format.");
      }
    }

    // Ensure entities array is present
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
    const uploadDir = process.env.UPLOAD_DIR || "uploads";

    // Compute relative path to 'uploads' directory
    const relativeFilePath = path.join(uploadDir, folderPath, file.filename);

    // Create file record in DB
    const fileData: ICreateFile = {
      imageName: file.originalname,
      mimeType: file.mimetype,
      size: file.size.toString(),
      path: relativeFilePath, // Relative path
      folderPath: path.join(uploadDir, folderPath), // Directory path
      entity: parsedEntities[0].entity, // Primary entity
      entityId: parsedEntities[0].entityId,
    };

    const newFile = await this.fileRepository.createFiles([fileData]);

    return newFile as any;
  }

  /**
   * Uploads multiple files and saves their metadata.
   * @param req Express Request object
   * @returns Promise<IFile[]>
   */
  public async uploadMultipleFiles(req: Request): Promise<IFile[]> {
    const files = req.files;
    if (!files || !(files instanceof Array) || files.length === 0) {
      throw new Error("No files uploaded.");
    }

    const entities = req.body.entities;

    // Parse entities if sent as JSON string
    let parsedEntities = entities;
    if (typeof entities === "string") {
      try {
        parsedEntities = JSON.parse(entities);
      } catch (parseError) {
        throw new Error("Invalid entities format.");
      }
    }

    // Ensure entities array is present
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
    const uploadDir = process.env.UPLOAD_DIR || "uploads";

    // Compute relative paths to 'uploads' directory
    const relativeFilePaths = files.map((file: Express.Multer.File) =>
      path.join(uploadDir, folderPath, file.filename)
    );

    // Prepare file data for each file
    const filesData: ICreateFile[] = files.map((file: Express.Multer.File) => ({
      imageName: file.originalname,
      mimeType: file.mimetype,
      size: file.size.toString(),
      path: path.join(uploadDir, folderPath, file.filename),
      folderPath: path.join(uploadDir, folderPath),
      entity: parsedEntities[0].entity, // Primary entity
      entityId: parsedEntities[0].entityId,
    }));

    const newFiles = await this.fileRepository.createFiles(filesData);

    return newFiles as any;
  }

  /**
   * Updates a file's metadata or replaces the file.
   * @param id File ID
   * @param req Express Request object
   * @returns Promise<IFile | null>
   */
  public async updateFile(id: string, req: Request): Promise<IFile | null> {
    const existingFile = await this.fileRepository.getFileById(id);
    if (!existingFile) {
      throw new Error("File not found.");
    }

    const file = req.file;

    let updatedData: Partial<ICreateFile> = {};

    if (file) {
      // If a new file is uploaded, replace the old one
      const sanitizedFileName = sanitize(file.originalname);
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const newFileName = `${uniqueSuffix}-${sanitizedFileName}`;
      const newRelativePath = path.join(
        path.dirname(existingFile.path),
        newFileName
      );

      // Update file metadata
      updatedData = {
        imageName: file.originalname,
        mimeType: file.mimetype,
        size: file.size.toString(),
        path: newRelativePath,
      };

      // Move the new file to the correct folder
      const oldAbsolutePath = path.resolve(existingFile.path);
      const newAbsolutePath = path.resolve(newRelativePath);

      // Ensure the destination directory exists
      await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true });

      // Move the file
      await fs.rename(oldAbsolutePath, newAbsolutePath);

      // Optionally, delete the old file if needed
      try {
        await fs.unlink(oldAbsolutePath);
        logger.info("Old file deleted successfully.", {
          path: oldAbsolutePath,
        });
      } catch (err: any) {
        logger.error("Failed to delete old file.", { error: err.message });
      }
    }

    // Update other metadata if provided
    const {
      imageName,
      mimeType,
      size,
      path: filePath,
      folderPath,
      entity,
      entityId,
    } = req.body;

    if (imageName) updatedData.imageName = imageName;
    if (mimeType) updatedData.mimeType = mimeType;
    if (size) updatedData.size = size;
    if (filePath) updatedData.path = filePath;
    if (folderPath) updatedData.folderPath = folderPath;
    if (entity) updatedData.entity = entity;
    if (entityId) updatedData.entityId = entityId;

    const updatedFile = await this.fileRepository.updateFileById(
      id,
      updatedData
    );

    return updatedFile as any;
  }

  /**
   * Deletes a file record and removes the physical file.
   * @param id File ID
   * @returns Promise<void>
   */
  public async deleteFile(id: string): Promise<void> {
    const existingFile = await this.fileRepository.getFileById(id);
    if (!existingFile) {
      throw new Error("File not found.");
    }

    // Delete the file record from DB
    await this.fileRepository.deleteFileById(id);

    // Delete the physical file
    const absolutePath = path.resolve(existingFile.path);
    try {
      await fs.unlink(absolutePath);
      logger.info("File deleted successfully.", { path: absolutePath });
    } catch (err: any) {
      logger.error("Failed to delete file from filesystem.", {
        error: err.message,
      });
      throw new Error("Failed to delete file from filesystem.");
    }
  }
}

export default FileService;
