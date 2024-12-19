// src/interfaces/file.ts

export interface IFile {
  imageName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

export interface ICreateFile {
  imageName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}
