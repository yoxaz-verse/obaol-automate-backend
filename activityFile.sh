#!/bin/bash

# Base directory
BASE_DIR="src"

# Create directories
mkdir -p $BASE_DIR/middlewares
mkdir -p $BASE_DIR/services
mkdir -p $BASE_DIR/repositories
mkdir -p $BASE_DIR/models
mkdir -p $BASE_DIR/routes

# Create and populate files

# ActivityFileMiddleware.ts
cat <<EOL > $BASE_DIR/middlewares/ActivityFileMiddleware.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

class ActivityFileMiddleware {
  validateActivityId(req: Request, res: Response, next: NextFunction) {
    const { activityId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return res.status(400).json({ error: "Invalid activity ID." });
    }
    next();
  }

  validateFileStatus(req: Request, res: Response, next: NextFunction) {
    const { status } = req.body;
    const validStatuses = ["Submitted", "Approved", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed statuses: ${validStatuses.join(", ")}` });
    }
    next();
  }
}

export default ActivityFileMiddleware;
EOL

# ActivityFileService.ts
cat <<EOL > $BASE_DIR/services/ActivityFileService.ts
import ActivityFileRepository from "../repositories/ActivityFileRepository";

class ActivityFileService {
  async createActivityFile(req: any, res: any) {
    try {
      const { activityId, files } = req.body;
      const result = await ActivityFileRepository.insertActivityFile({ activityId, files });
      return res.status(201).json({ message: "Activity file created successfully.", result });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getActivityFiles(req: any, res: any) {
    try {
      const { activityId } = req.params;
      const result = await ActivityFileRepository.getActivityFilesByActivityId(activityId);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateFileStatus(req: any, res: any) {
    try {
      const { activityId, fileId } = req.params;
      const { status, comments } = req.body;
      const result = await ActivityFileRepository.updateFileStatus(activityId, fileId, status, comments);
      return res.status(200).json({ message: "File status updated successfully.", result });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteFile(req: any, res: any) {
    try {
      const { activityId, fileId } = req.params;
      const result = await ActivityFileRepository.deleteFile(activityId, fileId);
      return res.status(200).json({ message: "File deleted successfully.", result });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export default ActivityFileService;
EOL

# ActivityFileRepository.ts
cat <<EOL > $BASE_DIR/repositories/ActivityFileRepository.ts
import ActivityFileModel from "../models/ActivityFileModel";

class ActivityFileRepository {
  async insertActivityFile(data: any) {
    const activityFile = new ActivityFileModel(data);
    return await activityFile.save();
  }

  async getActivityFilesByActivityId(activityId: string) {
    return await ActivityFileModel.findOne({ activityId }).populate("files.file");
  }

  async updateFileStatus(activityId: string, fileId: string, status: string, comments?: string) {
    return await ActivityFileModel.findOneAndUpdate(
      { activityId, "files.file": fileId },
      { $set: { "files.$.status": status, "files.$.comments": comments } },
      { new: true }
    ).populate("files.file");
  }

  async deleteFile(activityId: string, fileId: string) {
    return await ActivityFileModel.findOneAndUpdate(
      { activityId },
      { $pull: { files: { file: fileId } } },
      { new: true }
    );
  }
}

export default new ActivityFileRepository();
EOL

# ActivityFileModel.ts
cat <<EOL > $BASE_DIR/models/ActivityFileModel.ts
import mongoose, { Schema } from "mongoose";
import { IActivityFile } from "../interfaces/IActivityFile";

const ActivityFileSchema: Schema = new Schema(
  {
    activityId: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    files: [
      {
        file: { type: Schema.Types.ObjectId, ref: "File", required: true },
        status: { type: String, enum: ["Submitted", "Approved", "Rejected"], required: true },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        comments: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const ActivityFileModel = mongoose.model<IActivityFile>("ActivityFile", ActivityFileSchema);

export default ActivityFileModel;
EOL

# activityFileRoutes.ts
cat <<EOL > $BASE_DIR/routes/activityFileRoutes.ts
import { Router } from "express";
import ActivityFileService from "../services/ActivityFileService";
import ActivityFileMiddleware from "../middlewares/ActivityFileMiddleware";

const activityFileRoute = Router();
const activityFileService = new ActivityFileService();
const activityFileMiddleware = new ActivityFileMiddleware();

// POST /api/activity-files - Add a new activity file
activityFileRoute.post(
  "/",
  activityFileMiddleware.validateActivityId.bind(activityFileMiddleware),
  activityFileService.createActivityFile.bind(activityFileService)
);

// GET /api/activity-files/:activityId - Retrieve all files for a specific activity
activityFileRoute.get(
  "/:activityId",
  activityFileService.getActivityFiles.bind(activityFileService)
);

// PATCH /api/activity-files/:activityId/file/:fileId - Update file status
activityFileRoute.patch(
  "/:activityId/file/:fileId",
  activityFileMiddleware.validateFileStatus.bind(activityFileMiddleware),
  activityFileService.updateFileStatus.bind(activityFileService)
);

// DELETE /api/activity-files/:activityId/file/:fileId - Delete a specific file
activityFileRoute.delete(
  "/:activityId/file/:fileId",
  activityFileService.deleteFile.bind(activityFileService)
);

export default activityFileRoute;
EOL

# Completion message
echo "ActivityFile structure has been successfully set up."
