// src/interfaces/projectStatus.ts
import mongoose from "mongoose";

export interface IProjectStatus {
  _id: mongoose.Types.ObjectId; // Use mongoose.Types.ObjectId for better type alignment
  name: string;
  priority?: number;
}

export interface ICreateProjectStatus {
  name: string;
  priority?: number;
}

export interface IUpdateProjectStatus {
  name?: string;
  priority?: number;
}
