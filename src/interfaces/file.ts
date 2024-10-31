// src/interfaces/file.ts

export interface IFile {
  _id: string;
  imageName: string;
  mimeType: string;
  size: string;
  path: string;
  folderPath: string;
  entity: string;
  entityId: string;
}

export interface ICreateFile {
  imageName: string;
  mimeType: string;
  size: string;
  path: string;
  folderPath: string;
  entity: string;
  entityId: string;
}
