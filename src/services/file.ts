// src/services/fileService.ts

import FileModel from "../database/models/file";
import { IFile } from "../interfaces/file";

class FileService {
  /**
   * Create a new file entry
   */
  public async createFile(data: {
    imageName: string;
    mimeType: string;
    size: number;
    path: string;
    url: string;
  }): Promise<IFile> {
    const file = new FileModel(data);
    return file.save();
  }

  /**
   * Fetch a file by its ID
   */
  public async getFileById(fileId: string): Promise<IFile | null> {
    return FileModel.findById(fileId);
  }

  /**
   * Fetch all files
   */
  public async getAllFiles(): Promise<IFile[]> {
    return FileModel.find({});
  }

  /**
   * Update file details
   */
  public async updateFile(
    fileId: string,
    updates: Partial<IFile>
  ): Promise<IFile | null> {
    return FileModel.findByIdAndUpdate(fileId, updates, { new: true });
  }

  /**
   * Delete a file entry
   */
  public async deleteFile(fileId: string): Promise<IFile | null> {
    return FileModel.findByIdAndDelete(fileId);
  }

  /**
   * Create multiple files in bulk
   */
  public async createFiles(
    files: {
      imageName: string;
      mimeType: string;
      size: number;
      path: string;
      url: string;
    }[]
  ): Promise<IFile[]> {
    return FileModel.insertMany(files);
  }

  /**
   * Delete multiple files by their IDs
   */
  public async deleteFiles(fileIds: string[]): Promise<number> {
    const result = await FileModel.deleteMany({ _id: { $in: fileIds } });
    return result.deletedCount || 0;
  }
}

export default FileService;
