// src/middlewares/upload.ts
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import sanitize from "sanitize-filename";
import logger from "../utils/logger";
import envVars from "../config/validateEnv";
import { ActivityModel } from "../database/models/activity";

// Dynamic folder structure for different entity types based on URL params
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Extract parameters from the request body
      const { projectId, activityId, locationId } = req.body;

      // Check if `activityId` exists, fetch `projectId` from the database
      if (activityId) {
        let projectId: string | undefined = undefined;
        const activity = await ActivityModel.findById(activityId)
          .select("project")
          .lean();
        if (!activity) {
          throw new Error(`Activity with ID ${activityId} not found.`);
        }
        // projectId = activity.id.toString();
      }

      // Dynamically build folder path based on entity type
      let folderPath = "";

      if (projectId) {
        folderPath = path.join("project", sanitize(projectId));
        if (activityId) {
          folderPath = path.join(folderPath, "activity", sanitize(activityId));
        }
      } else if (locationId) {
        folderPath = path.join("location", sanitize(locationId));
      } else {
        throw new Error("Entity type not found in the URL parameters.");
      }

      // Set the base upload directory
      const uploadDir = envVars.UPLOAD_DIR || "uploads";
      const uploadPath = path.join(__dirname, `../../${uploadDir}`, folderPath);

      // Create the folder if it doesn't exist
      fs.mkdir(uploadPath, { recursive: true }, (err) => {
        if (err) {
          cb(err, "");
        } else {
          cb(null, uploadPath);
        }
      });
    } catch (error: any) {
      logger.error("Error setting upload destination.", {
        error: error.message,
      });
      cb(error, "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedFileName = file.originalname.replace(
      /[^a-zA-Z0-9.\-_]/g,
      ""
    );
    cb(null, `${uniqueSuffix}-${sanitizedFileName}`);
  },
});

// File filter to allow any file type (no restrictions)
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  cb(null, true); // Allow all file types
};

// Initialize Multer
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
  fileFilter,
});

export default upload;
