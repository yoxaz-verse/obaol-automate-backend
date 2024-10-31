#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to create directories if they don't exist
create_dir() {
  mkdir -p "$1"
}

# Function to create files with content
create_file() {
  local path=$1
  shift
  cat <<EOT > "$path"
$*
EOT
}

# Create Model
create_dir src/database/models
create_file src/database/models/file.ts \
"import mongoose from 'mongoose';

interface IFile extends mongoose.Document {
  imageName: string;
  mimeType: string;
  size: string;
  path: string;
}

const FileSchema = new mongoose.Schema(
  {
    imageName: { type: String, required: true }, // Name of the file/image
    mimeType: { type: String, required: true },  // MIME type (e.g., 'image/jpeg', 'application/pdf')
    size: { type: String, required: true },      // File size as a string
    path: { type: String, required: true },      // File path for local storage
  },
  { timestamps: true }
);

export const FileModel = mongoose.model<IFile>('File', FileSchema);
"

# Create Repository
create_dir src/database/repositories
create_file src/database/repositories/file.ts \
"import { FileModel } from '../models/file';
import { IFile, ICreateFile } from '../../interfaces/file';

class FileRepository {
  public async getFilesByIds(ids: string[]): Promise<IFile[]> {
    return await FileModel.find({ _id: { \$in: ids } });
  }

  public async getFileById(id: string): Promise<IFile | null> {
    return FileModel.findById(id);
  }

  public async createFiles(filesData: ICreateFile[]): Promise<IFile[]> {
    return await FileModel.insertMany(filesData);
  }

  public async updateFileById(id: string, fileData: Partial<ICreateFile>): Promise<IFile | null> {
    return FileModel.findByIdAndUpdate(id, fileData, { new: true });
  }

  public async deleteFilesByIds(ids: string[]): Promise<void> {
    await FileModel.deleteMany({ _id: { \$in: ids } });
  }

  public async deleteFileById(id: string): Promise<IFile | null> {
    return FileModel.findByIdAndDelete(id);
  }
}

export default FileRepository;
"

# Create Service
create_dir src/services
create_file src/services/file.ts \
"import { Request, Response } from 'express';
import FileRepository from '../database/repositories/file';
import fs from 'fs';
import path from 'path';

class FileService {
  private fileRepository: FileRepository;

  constructor() {
    this.fileRepository = new FileRepository();
  }

  public async getFiles(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).send('Invalid IDs');
      }

      const files = await this.fileRepository.getFilesByIds(ids);
      res.status(200).json({ success: true, data: files });
    } catch (error) {
      res.status(500).send('Failed to fetch files');
    }
  }

  public async getFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = await this.fileRepository.getFileById(id);
      if (!file) return res.status(404).send('File not found');
      res.status(200).json({ success: true, data: file });
    } catch (error) {
      res.status(500).send('Failed to fetch file');
    }
  }

  public async uploadSingleFile(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) return res.status(400).send('No file uploaded');

      const fileData = {
        imageName: file.originalname,
        mimeType: file.mimetype,
        size: file.size.toString(),
        // Store the relative path (e.g., uploads/filename.ext)
        path: path.join('uploads', file.filename),
      };

      const [newFile] = await this.fileRepository.createFiles([fileData]);
      res.status(201).json({ success: true, data: newFile });
    } catch (error) {
      res.status(500).send('File upload failed');
    }
  }

  public async uploadMultipleFiles(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).send('No files uploaded');

      const fileData = files.map(file => ({
        imageName: file.originalname,
        mimeType: file.mimetype,
        size: file.size.toString(),
        path: path.join('uploads', file.filename),
      }));

      const newFiles = await this.fileRepository.createFiles(fileData);
      res.status(201).json({ success: true, data: newFiles });
    } catch (error) {
      res.status(500).send('File upload failed');
    }
  }

  public async deleteFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedFile = await this.fileRepository.deleteFileById(id);
      if (!deletedFile) return res.status(404).send('File not found');

      fs.unlink(deletedFile.path, (err) => {
        if (err) console.error('Failed to delete file from filesystem');
      });

      res.status(200).json({ success: true, data: deletedFile });
    } catch (error) {
      res.status(500).send('Failed to delete file');
    }
  }

  public async deleteFiles(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).send('Invalid IDs');
      }

      await this.fileRepository.deleteFilesByIds(ids);
      res.status(200).json({ success: true, message: 'Files deleted successfully' });
    } catch (error) {
      res.status(500).send('Failed to delete files');
    }
  }

  public async replaceFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) return res.status(400).send('No file uploaded');

      const updatedFileData = {
        imageName: file.originalname,
        mimeType: file.mimetype,
        size: file.size.toString(),
        path: path.join('uploads', file.filename),
      };

      const updatedFile = await this.fileRepository.updateFileById(id, updatedFileData);
      res.status(200).json({ success: true, data: updatedFile });
    } catch (error) {
      res.status(500).send('Failed to replace file');
    }
  }
}

export default FileService;
"

# Create Middleware
create_dir src/middlewares
create_file src/middlewares/file.ts \
"import { Request, Response, NextFunction } from 'express';

class FileMiddleware {
  public async deleteFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).send('Invalid IDs');
      }
      next();
    } catch (error) {
      res.status(500).send('An unexpected error occurred');
    }
  }

  public async getFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).send('Invalid IDs');
      }
      next();
    } catch (error) {
      res.status(500).send('An unexpected error occurred');
    }
  }
}

export default FileMiddleware;
"

# Create Interface
create_dir src/interfaces
create_file src/interfaces/file.ts \
"export interface IFile {
  imageName: string;
  mimeType: string;
  size: string;
  path: string;
}

export interface ICreateFile {
  imageName: string;
  mimeType: string;
  size: string;
  path: string;
}
"

# Create Routes
create_dir src/routes
create_file src/routes/fileRoute.ts \
"import { Router } from 'express';
import FileService from '../services/file';
import FileMiddleware from '../middlewares/file';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Define the uploads directory
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure that the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, \`\${uniqueSuffix}\${path.extname(file.originalname)}\`);
  },
});

const upload = multer({ storage });
const fileRoute = Router();
const fileService = new FileService();
const fileMiddleware = new FileMiddleware();

// File Upload
fileRoute.post('/upload', upload.single('file'), fileService.uploadSingleFile.bind(fileService));
fileRoute.post('/upload/multiple', upload.array('files', 10), fileService.uploadMultipleFiles.bind(fileService));

// Replace File
fileRoute.put('/replace/:id', upload.single('file'), fileService.replaceFile.bind(fileService));

// File Fetch
fileRoute.post('/fetch', fileMiddleware.getFiles.bind(fileMiddleware), fileService.getFiles.bind(fileService));
fileRoute.get('/:id', fileService.getFile.bind(fileService));

// File Deletion
fileRoute.delete('/delete', fileMiddleware.deleteFiles.bind(fileMiddleware), fileService.deleteFiles.bind(fileService));
fileRoute.delete('/:id', fileService.deleteFile.bind(fileService));

export default fileRoute;
"

# Completion Message
echo "File module with single, bulk upload, fetch, delete, and replace operations generated successfully."
