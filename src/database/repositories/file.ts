// src/database/repositories/FileRepository.ts

import { ICreateFile } from "../../interfaces/file";
import FileModel, { IFile } from "../models/file";

class FileRepository {
  public async getFilesByIds(ids: string[]): Promise<IFile[]> {
    return await FileModel.find({ _id: { $in: ids } }).lean<IFile[]>();
  }

  public async getFileById(id: string): Promise<IFile | null> {
    return FileModel.findById(id).lean<IFile | null>();
  }

  public async createFiles(filesData: ICreateFile[]): Promise<IFile[]> {
    try {
      const createdFiles = await FileModel.insertMany(filesData);
      return createdFiles.map((file) => file.toObject() as IFile);
    } catch (error: any) {
      throw new Error(`Failed to create files: ${error.message}`);
    }
  }

  public async updateFileById(
    id: string,
    fileData: Partial<ICreateFile>
  ): Promise<IFile | null> {
    return FileModel.findByIdAndUpdate(id, fileData, {
      new: true,
    }).lean<IFile | null>();
  }

  public async deleteFilesByIds(ids: string[]): Promise<void> {
    await FileModel.deleteMany({ _id: { $in: ids } });
  }

  public async deleteFileById(id: string): Promise<IFile | null> {
    return FileModel.findByIdAndDelete(id).lean<IFile | null>();
  }
}

export default FileRepository;
