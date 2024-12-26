// src/interfaces/file.ts

export interface IFile {
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

export interface ICreateFile {
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}
