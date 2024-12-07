#!/bin/bash

# Base directory
BASE_DIR="src"

# Create directories
mkdir -p $BASE_DIR/controllers
mkdir -p $BASE_DIR/middlewares
mkdir -p $BASE_DIR/services
mkdir -p $BASE_DIR/repositories
mkdir -p $BASE_DIR/models
mkdir -p $BASE_DIR/routes

# Create and populate files

# ActivityFileController.ts
cat <<EOL > $BASE_DIR/controllers/ActivityFileController.ts
import { Request, Response } from "express";
import ActivityFileService from "../services/ActivityFileService";

class ActivityFileController {
  async addActivityFile(req: Request, res: Response) {
    const { activityId, files } = req.body;

    try {
      const data = { activityId, files };
      const result = await ActivityFileService.addActivityFile(data);
      res.status(201).json({ message: "Activity file added successfully.", result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getActivityFiles(req: Request, res: Response) {
    const { activityId } = req.params;

    try {
      const result = await ActivityFileService.getActivityFiles(activityId);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ActivityFileController();
EOL

# ActivityFileMiddleware.ts
cat <<EOL > $BASE_DIR/middlewares/ActivityFileMiddleware.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export const validateActivityId = (req: Request, res: Response, next: NextFunction) => {
  const { activityId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(activityId)) {
    return res.status(400).json({ error: "Invalid activity ID." });
  }
  next();
};
EOL

# ActivityFileService.ts
cat <<EOL > $BASE_DIR/services/ActivityFileService.ts
import ActivityFileRepository from "../repositories/ActivityFileRepository";

class ActivityFileService {
  async addActivityFile(data: any) {
    const result = await ActivityFileRepository.insertActivityFile(data);
    return result;
  }

  async getActivityFiles(activityId: string) {
    return await ActivityFileRepository.getActivityFileById(activityId);
  }
}

export default new ActivityFileService();
EOL

# ActivityFileRepository.ts
cat <<EOL > $BASE_DIR/repositories/ActivityFileRepository.ts
import ActivityFileModel from "../models/ActivityFileModel";

class ActivityFileRepository {
  async insertActivityFile(data: any) {
    const activityFile = new ActivityFileModel(data);
    return await activityFile.save();
  }

  async getActivityFileById(activityId: string) {
    return await ActivityFileModel.findOne({ activityId }).populate("files.file");
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

# FileModel.ts
cat <<EOL > $BASE_DIR/models/FileModel.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IFile extends Document {
  imageName: string;
  mimeType: string;
  size: string;
  path: string;
  folderPath: string;
  entity: string;
  entityId: string;
  url: string;
}

const FileSchema: Schema = new Schema(
  {
    imageName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: String, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
    folderPath: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
  },
  { timestamps: true }
);

const FileModel = mongoose.model<IFile>("File", FileSchema);

export default FileModel;
EOL

# activityFileRoutes.ts
cat <<EOL > $BASE_DIR/routes/activityFileRoutes.ts
import express from "express";
import ActivityFileController from "../controllers/ActivityFileController";
import { validateActivityId } from "../middlewares/ActivityFileMiddleware";

const router = express.Router();

router.post("/activity-files", validateActivityId, ActivityFileController.addActivityFile);
router.get("/activity-files/:activityId", ActivityFileController.getActivityFiles);

export default router;
EOL

# app.ts
cat <<EOL > $BASE_DIR/app.ts
import express from "express";
import mongoose from "mongoose";
import activityFileRoutes from "./routes/activityFileRoutes";

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/your_database_name", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Database connected"))
  .catch(err => console.log(err));

// Routes
app.use("/api", activityFileRoutes);

// Start server
app.listen(3000, () => console.log("Server is running on port 3000"));
EOL

# Completion message
echo "ActivityFile backend structure created successfully."
