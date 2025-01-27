#!/bin/bash

# ----- Start of src/app.ts -----

// src/app.ts

import express from "express";
import helmet from "helmet";
import { errorHandler } from "./utils/errorHandler";
import { responseFormatter } from "./utils/responseFormatter";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes";
import path from "path"; // Import path to handle file paths
import apiLogger from "./middlewares/apiLogger";

const app = express();

// Use Helmet for security headers (optional, can be uncommented if needed)
// app.use(
//   helmet({
//     contentSecurityPolicy: false, // Disable CSP for APIs
//     frameguard: false, // No need for frameguard in APIs
//     hidePoweredBy: true, // Hide the X-Powered-By header
//     hsts: false, // Disable HSTS for APIs
//     xssFilter: true, // Enable XSS filter
//     noSniff: true, // Prevent MIME-sniffing
//     referrerPolicy: { policy: "same-origin" }, // Set Referrer-Policy header
//   })
// );

// Middleware for parsing JSON and formatting responses
app.use(express.json());
// If you need to parse URL-encoded data, uncomment the following line
// app.use(express.urlencoded({ extended: true }));

// Apply responseFormatter middleware before other middleware and routes
app.use(responseFormatter);

// CORS middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"], // Specify allowed origins
    credentials: true,
  })
);
app.use(apiLogger);
// Logging middleware
app.use(morgan("common"));

// Cookie parsing middleware
app.use(cookieParser());

// Serve static files from uploads before defining routes
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    // Optional: Set cache options or other static file options here
    extensions: ["jpg", "jpeg", "png", "gif"], // Specify allowed file extensions
    index: false, // Disable directory indexing
  })
);

// API routes
app.use("/api", routes);

// 404 Handler (should be after all other routes and middleware)
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    message: "Resource not found",
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

export default app;

# ----- End of src/app.ts -----


# ----- Start of src/config/index.ts -----

import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 5001;
export const BASE_URL = process.env.BASE_URL || "http://localhost:5001";
export const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://yoxaz:3hoZTHvJcbPkUkyL@italy-activity.kk3db.mongodb.net/activity-tracking";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const JWT_EXPIRE = process.env.JWT_EXPIRE || "1d";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh";
export const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "10d";

# ----- End of src/config/index.ts -----


# ----- Start of src/config/multerConfig.ts -----

import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Define the uploads directory relative to the project root
const uploadDir = path.join(__dirname, "..", "..", "uploads");

// Ensure that the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Use the dynamic directory path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex"); // Generate a unique filename
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`); // Maintain the original file extension
  },
});

// Create the Multer instance
const upload = multer({ storage });

export default upload;

# ----- End of src/config/multerConfig.ts -----


# ----- Start of src/config/s3Config.ts -----

// import {
//   S3Client,
//   PutObjectCommand,
//   GetObjectCommand,
//   DeleteObjectCommand,
// } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import fs from "fs";

// import {
//   AWS_ACCESS_KEY_ID,
//   AWS_SECRET_ACCESS_KEY,
//   AWS_REGION,
//   AWS_BUCKET_NAME,
// } from "../config";

// const s3Client = new S3Client({
//   credentials: {
//     accessKeyId: AWS_ACCESS_KEY_ID || "",
//     secretAccessKey: AWS_SECRET_ACCESS_KEY || "",
//   },
//   region: AWS_REGION || "",
// });

// const bucketName = AWS_BUCKET_NAME || "";

// async function generatePresignedUrl(key: string): Promise<string> {
//   const command = new GetObjectCommand({
//     Bucket: bucketName,
//     Key: key,
//   });

//   const url = await getSignedUrl(s3Client, command, { expiresIn: 604800 }); // 1 week expiration

//   return url;
// }

// async function uploadS3File(
//   filePath: string,
//   newFileNameKey: string
// ): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const fileStream = fs.createReadStream(filePath);

//     const params = {
//       Bucket: bucketName,
//       Key: newFileNameKey,
//       Body: fileStream,
//     };

//     s3Client
//       .send(new PutObjectCommand(params))
//       .then(() => generatePresignedUrl(newFileNameKey))
//       .then((url: string) => {
//         console.log(`File uploaded successfully. URL: ${url}`);
//         resolve(url);
//       })
//       .catch((err: Error) => {
//         console.error(`Error uploading file: ${err.message}`);
//         reject(err);
//       });
//   });
// }

// async function deleteS3File(newFileNameKey: string): Promise<void> {
//   const command = new DeleteObjectCommand({
//     Bucket: bucketName,
//     Key: newFileNameKey,
//   });

//   return s3Client
//     .send(command)
//     .then(() => {
//       console.log(`File deleted successfully: ${newFileNameKey}`);
//     })
//     .catch((err: Error) => {
//       console.error(`Error deleting file: ${newFileNameKey}, ${err.message}`);
//       throw err;
//     });
// }

// export { uploadS3File, deleteS3File, generatePresignedUrl };

# ----- End of src/config/s3Config.ts -----


# ----- Start of src/config/swaggerConfig.ts -----

const swaggerJSDoc = require("swagger-jsdoc");
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
    },
  },
  apis: ["./src/routes/**/*.ts"], // Path to your routes
};
const swaggerSpec = swaggerJSDoc(options);

# ----- End of src/config/swaggerConfig.ts -----


# ----- Start of src/config/validateEnv.ts -----

// src/config/validateEnv.ts

import logger from "../utils/logger";
import Joi from "joi";

const envSchema = Joi.object({
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().uri().required(),
  UPLOAD_DIR: Joi.string().default("uploads"),
  BASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(6).required(),
})
  .unknown()
  .required();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  logger.error("Env Missing : ", {
    error: error.message,
  });
  throw new Error(`Config validation error: ${error.message}`);
}

export default envVars;

# ----- End of src/config/validateEnv.ts -----


# ----- Start of src/controllers/activityFileController.ts -----

import { Request, Response } from "express";
import {
  createActivityFiles,
  getActivityFiles,
  updateActivityFileStatus,
  deleteActivityFile,
} from "../services/activityFile";
import path from "path";

export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const { activityId, comments } = req.body;
    const uploadPath = path.join(__dirname, "../../uploads/activity-files");
    // const userId = req.user?.id;

    console.log("Resolved Upload Path:", uploadPath);
    console.log("Activity ID:", activityId);

    if (!activityId || !uploadPath) {
      return res
        .status(400)
        .json({ message: "Activity ID and upload path are required" });
    }

    let files: Express.Multer.File[] = [];
    if (Array.isArray(req.files)) {
      files = req.files;
    } else if (req.files && typeof req.files === "object") {
      files = Object.values(req.files).flat();
    }

    if (files.length === 0) {
      return res.status(400).json({ message: "No files provided" });
    }

    const result = await createActivityFiles(
      comments,
      activityId,
      files,
      uploadPath
      // userId
    );
    res
      .status(201)
      .json({ message: "Files uploaded successfully", data: result });
  } catch (error) {
    res.status(500).json({ message: error || "An error occurred" });
  }
};

export const getFiles = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    const result = await getActivityFiles(activityId);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const updateFile = async (req: Request, res: Response) => {
  try {
    const { activityId, fileId } = req.params;
    const { status, comments } = req.body;

    const result = await updateActivityFileStatus(
      activityId,
      fileId,
      status,
      comments
    );
    res
      .status(200)
      .json({ message: "File updated successfully", data: result });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { activityId, fileId } = req.params;

    const result = await deleteActivityFile(activityId, fileId);
    res
      .status(200)
      .json({ message: "File deleted successfully", data: result });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

# ----- End of src/controllers/activityFileController.ts -----


# ----- Start of src/controllers/fileController.ts -----

// src/controllers/fileController.ts
import FileService from "../services/file";
import { Request, Response } from "express";

class FileController {
  private fileService = new FileService();

  /**
   * Create a new file entry
   */
  public createFile = async (req: Request, res: Response) => {
    try {
      const { fileName, mimeType, size, path, url } = req.body;
      const file = await this.fileService.createFile({
        fileName,
        mimeType,
        size,
        path,
        url,
      });
      res.status(201).json({ message: "File created successfully", file });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get a file by ID
   */
  public getFileById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = await this.fileService.getFileById(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.status(200).json({ file });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get all files
   */
  public getAllFiles = async (_req: Request, res: Response) => {
    try {
      const files = await this.fileService.getAllFiles();
      res.status(200).json({ files });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Update a file entry
   */
  public updateFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedFile = await this.fileService.updateFile(id, updates);
      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }
      res
        .status(200)
        .json({ message: "File updated successfully", file: updatedFile });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Delete a file entry
   */
  public deleteFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedFile = await this.fileService.deleteFile(id);
      if (!deletedFile) {
        return res.status(404).json({ message: "File not found" });
      }
      res.status(200).json({ message: "File deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Handle bulk file uploads
   */
  public uploadBulkFiles = async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[]; // Assuming multer handles the file upload
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded." });
      }

      // Prepare file metadata for saving
      const fileData = files.map((file) => ({
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`, // Dynamically generate URL
      }));

      const uploadedFiles = await this.fileService.createFiles(fileData);

      res.status(201).json({
        message: "Files uploaded successfully.",
        files: uploadedFiles,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Handle bulk file deletion
   */
  public deleteBulkFiles = async (req: Request, res: Response) => {
    try {
      const { fileIds } = req.body;
      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ message: "No file IDs provided." });
      }

      const deletedCount = await this.fileService.deleteFiles(fileIds);

      res.status(200).json({
        message: `${deletedCount} files deleted successfully.`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export default new FileController();

# ----- End of src/controllers/fileController.ts -----


# ----- Start of src/database/config/multerConfig.ts -----

import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Use the uploads directory from .env or set a default value
const uploadDir =
  process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");

// Ensure that the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Use the dynamic directory path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex"); // Generate a unique filename
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`); // Maintain the original file extension
  },
});

// Create the Multer instance with optional limits
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
  fileFilter: (req, file, cb) => {
    // Validate the file type
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Only JPEG, PNG, and PDF files are allowed."
        )
      );
    }
  },
});

export default upload;

# ----- End of src/database/config/multerConfig.ts -----


# ----- Start of src/database/connection.ts -----

// src/config/db.ts

import mongoose from "mongoose";
import logger from "../utils/logger";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error("MongoDB Connection Error:", { error: error.message });
    process.exit(1);
  }
};

export default connectDB;

# ----- End of src/database/connection.ts -----


# ----- Start of src/database/models/activity.ts -----

import mongoose from "mongoose";
import { ProjectModel } from "./project";
import { WorkerModel } from "./worker";
import { ManagerModel } from "./manager";
import { CustomerModel } from "./customer";
import { ActivityStatusModel } from "./activityStatus";
import { ActivityTypeModel } from "./activityType";
import { ActivityManagerModel } from "./activityManager";
import { boolean } from "joi";

interface IActivity extends mongoose.Document {
  _id: string;
  title: string;
  description: string;
  project: mongoose.Schema.Types.ObjectId | typeof ProjectModel;
  forecastDate?: Date;
  actualDate?: Date;
  targetOperationDate?: Date;
  targetFinanceDate?: Date;
  activityManager: mongoose.Schema.Types.ObjectId | typeof ActivityManagerModel;
  worker: Array<mongoose.Schema.Types.ObjectId | typeof WorkerModel>;
  updatedBy: string; // Role of the user who last updated the activity
  statusHistory: Array<
    mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel
  >;
  allowTimesheets: Boolean;
  status: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel;
  previousStatus?: mongoose.Schema.Types.ObjectId | typeof ActivityStatusModel; // Previous status (for suspension/blocking)
  rejectionReason: string[]; // List of reasons for rejection
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  type: mongoose.Schema.Types.ObjectId | typeof ActivityTypeModel;
  hoursSpent: number; // Hours spent on the activity
  isDeleted?: boolean;
}

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },

    allowTimesheets: { type: Boolean, default: true },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    forecastDate: { type: Date },
    actualDate: { type: Date },
    targetFinanceDate: { type: Date },
    targetOperationDate: { type: Date },
    worker: [{ type: mongoose.Schema.Types.ObjectId, ref: "Worker" }],
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityType",
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
      enum: ["Worker", "ActivityManager", "ProjectManager", "Admin"],
    },
    hoursSpent: { type: Number },
    statusHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ActivityStatus" },
    ],
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityStatus",
      required: true,
    },
    previousStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityStatus",
    }, // For suspension/blocking
    rejectionReason: [{ type: String, default: "" }],

    activityManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityManager",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Custom ID generator
ActivitySchema.pre<IActivity>("save", async function (next) {
  if (!this.title && this.isNew) {
    await this.populate("project type");

    const project = this.project as any;
    const type = this.type as any;

    if (project?.customId && type?.name) {
      const projectTypeKey = `${project.customId}-${type.name}`;

      // Find or create a sequence value for the projectTypeKey
      const counter = await ActivityCounterModel.findOneAndUpdate(
        { projectTypeKey },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true } // Create if doesn't exist
      );

      const sequenceNumber = counter.sequenceValue.toString().padStart(4, "0"); // Pad to 4 digits
      this.title = `${project.customId.toUpperCase()}-${type.name.toUpperCase()}-${sequenceNumber}`;
    } else {
      console.warn("Incomplete data for custom ID generation.");
      this.title = `${Date.now()}`;
    }
  }
  next();
});

const ActivityCounterSchema = new mongoose.Schema({
  projectTypeKey: { type: String, unique: true }, // Unique key: Project.customId + Activity.type
  sequenceValue: { type: Number, default: 0 },
});

export const ActivityCounterModel = mongoose.model(
  "ActivityCounter",
  ActivityCounterSchema

  
);

export const ActivityModel = mongoose.model<IActivity>(
  "Activity",
  ActivitySchema
);

# ----- End of src/database/models/activity.ts -----


# ----- Start of src/database/models/activityFile.ts -----

// src/database/models/ActivityFileModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IActivityFile extends Document {
  activityId: mongoose.Types.ObjectId;
  files: {
    file: mongoose.Types.ObjectId;
    status: "Submitted" | "Approved" | "Rejected";
    submittedBy?: mongoose.Types.ObjectId;
    comments?: string;
  }[];
}

const ActivityFileSchema = new Schema<IActivityFile>(
  {
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
    files: [
      {
        file: { type: Schema.Types.ObjectId, ref: "File", required: true },
        status: {
          type: String,
          enum: ["Submitted", "Approved", "Rejected"],
          required: true,
        },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        comments: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const ActivityFileModel = mongoose.model<IActivityFile>(
  "ActivityFile",
  ActivityFileSchema
);

export default ActivityFileModel;

# ----- End of src/database/models/activityFile.ts -----


# ----- Start of src/database/models/activityManager.ts -----

import mongoose from "mongoose";
import { IActivityManager } from "../../interfaces/activityManager";

const ActivityManagerSchema = new mongoose.Schema<IActivityManager>(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Linking to Admin
    role: { type: String, default: "activityManager" }, // Assign default role
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
/*
import bcrypt from "bcrypt";

ActivityManagerSchema.pre<IActivityManager>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
*/

export const ActivityManagerModel = mongoose.model<IActivityManager>(
  "ActivityManager",
  ActivityManagerSchema
);

# ----- End of src/database/models/activityManager.ts -----


# ----- Start of src/database/models/activityStatus.ts -----

import mongoose from "mongoose";

interface IActivityStatus extends mongoose.Document {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
}

const ActivityStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ActivityStatusModel = mongoose.model<IActivityStatus>(
  "ActivityStatus",
  ActivityStatusSchema
);

# ----- End of src/database/models/activityStatus.ts -----


# ----- Start of src/database/models/activityType.ts -----

import mongoose from "mongoose";

interface IActivityType extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
}

const ActivityTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const ActivityTypeModel = mongoose.model<IActivityType>(
  "ActivityType",
  ActivityTypeSchema
);

# ----- End of src/database/models/activityType.ts -----


# ----- Start of src/database/models/admin.ts -----

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

interface IAdmin extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  refreshToken?: string;
  role: string; // Assign default role
  // comparePassword(candidatePassword: string): Promise<boolean>; // Password comparison
}

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    refreshToken: { type: String },
    role: { type: String, default: "admin" }, // Assign default role
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
// adminSchema.pre("save", async function (next) {
//   const admin = this as IAdmin;
//   if (!admin.isModified("password")) return next();k

//   try {
//     const salt = await bcrypt.genSalt(12);
//     admin.password = await bcrypt.hash(admin.password, salt);
//     next();
//   } catch (err) {
//     next();
//   }
// });

// Password comparison method
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);

# ----- End of src/database/models/admin.ts -----


# ----- Start of src/database/models/customer.ts -----

import mongoose from "mongoose";

interface ICustomer extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  role: string; // Assign default role
}

const CustomerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "Customer" }, // Assign default role
  },
  { timestamps: true }
);

export const CustomerModel = mongoose.model<ICustomer>(
  "Customer",
  CustomerSchema
);

# ----- End of src/database/models/customer.ts -----


# ----- Start of src/database/models/emailChecker.ts -----

// Import other user-related models if necessary

import { ActivityManagerModel } from "./activityManager";
import { AdminModel } from "./admin";
import { CustomerModel } from "./customer";
import { ProjectManagerModel } from "./projectManager";
import { WorkerModel } from "./worker";

export const isEmailTaken = async (email: string): Promise<boolean> => {
  // Check in all relevant user collections
  const projectManagerExists = await ProjectManagerModel.findOne({ email });
  const activityManagerExists = await ActivityManagerModel.findOne({ email });
  const customerExists = await CustomerModel.findOne({ email });
  const workerExists = await WorkerModel.findOne({ email });
  const adminExists = await AdminModel.findOne({ email });
  // Add checks for other user types if needed

  return !!(
    activityManagerExists ||
    projectManagerExists ||
    customerExists ||
    workerExists ||
    adminExists
  );
};
import { Request, Response, NextFunction } from "express";

export const validateUniqueEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const emailInUse = await isEmailTaken(email);

  if (emailInUse) {
    return res.status(409).json({ message: "Email is already in use." });
  }

  next();
};

# ----- End of src/database/models/emailChecker.ts -----


# ----- Start of src/database/models/error.ts -----

import mongoose from "mongoose";

interface ErrorDocument extends mongoose.Document {
  message: string;
  stack: string;
  resolved: boolean;
  stage: string;
  api: string;
  location: string;
  body: object;
}

const errorSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    stack: { type: String },
    resolved: { type: Boolean, default: false },
    stage: { type: String, required: true },
    api: { type: String, required: true },
    location: { type: String },
    body: { type: Object },
  },
  {
    timestamps: true,
  }
);

export const ErrorModel = mongoose.model<ErrorDocument>("Error", errorSchema);


# ----- End of src/database/models/error.ts -----


# ----- Start of src/database/models/exampleModel.ts -----

import mongoose, { Schema, Document } from "mongoose";

export interface IExample extends Document {
  name: string;
  description: string;
}

const ExampleSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
});

export default mongoose.model<IExample>("Example", ExampleSchema);

# ----- End of src/database/models/exampleModel.ts -----


# ----- Start of src/database/models/file.ts -----

// src/database/models/FileModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IFile extends Document {
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  // createdAt: Date;
  // updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

const FileModel = mongoose.model<IFile>("File", FileSchema);

export default FileModel;

# ----- End of src/database/models/file.ts -----


# ----- Start of src/database/models/location.ts -----

import mongoose from "mongoose";
import { ILocation } from "../../interfaces/location";

const LocationSchema = new mongoose.Schema<ILocation>(
  {
    customId: { type: String, unique: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String },
    isNearAnotherLocation: { type: Boolean, default: false },
    latitude: { type: String },
    longitude: { type: String },
    map: { type: String, required: true },
    nation: { type: String, required: true },
    owner: { type: String, required: true },
    province: { type: String, required: true },
    street: { type: String },
    region: { type: String, required: true },
    locationType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocationType",
      required: true,
    },
    locationManagers: [
      {
        manager: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "LocationManager",
          required: true,
        },
        code: { type: String, required: true }, // Code specific to this location
      },
    ],
  },
  { timestamps: true }
);

// Custom ID generator
LocationSchema.pre<ILocation>("save", async function (next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!this.customId) {
      const provinceKey = this.province.toUpperCase();

      const counter = await LocationCounterModel.findOneAndUpdate(
        { provinceKey },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true, session }
      );

      if (!counter) {
        throw new Error(
          `Failed to update sequence for province: ${provinceKey}`
        );
      }

      const sequenceNumber = counter.sequenceValue.toString().padStart(5, "0");
      this.customId = `MG-${provinceKey}-${sequenceNumber}`;
      console.log(`Generated customId: ${this.customId}`);
    }
    await session.commitTransaction();
    next();
  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction Error in pre-save hook:", error);
    next();
  } finally {
    session.endSession();
  }
});

const LocationCounterSchema = new mongoose.Schema({
  provinceKey: { type: String, unique: true }, // Province name as the unique key
  sequenceValue: { type: Number, default: 0 }, // Incrementing sequence number
});

export const LocationCounterModel = mongoose.model(
  "LocationCounter",
  LocationCounterSchema
);

export const LocationModel = mongoose.model<ILocation>(
  "Location",
  LocationSchema
);

# ----- End of src/database/models/location.ts -----


# ----- Start of src/database/models/locationManager.ts -----

import { ILocation } from "@interfaces/location";
import mongoose from "mongoose";

interface ILocationManager extends mongoose.Document {
  name: string;
}

const LocationManagerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const LocationManagerModel = mongoose.model<ILocationManager>(
  "LocationManager",
  LocationManagerSchema
);

# ----- End of src/database/models/locationManager.ts -----


# ----- Start of src/database/models/locationType.ts -----

import mongoose from "mongoose";

interface ILocationType extends mongoose.Document {
  name: string;
}
const LocationTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const LocationTypeModel = mongoose.model<ILocationType>(
  "LocationType",
  LocationTypeSchema
);

# ----- End of src/database/models/locationType.ts -----


# ----- Start of src/database/models/manager.ts -----

import mongoose from "mongoose";
import { IManager } from "../../interfaces/manager";

const ManagerSchema = new mongoose.Schema<IManager>(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Linking to Admin
    fileId: { type: String }, // Identifier for the uploaded file
    fileURL: { type: String }, // URL to access the uploaded file (optional)
    role: { type: String, default: "manager" }, // Assign default role
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
// Uncomment the following lines if you wish to hash passwords before saving
/*
import bcrypt from "bcrypt";

ManagerSchema.pre<IManager>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
*/

export const ManagerModel = mongoose.model<IManager>("Manager", ManagerSchema);

# ----- End of src/database/models/manager.ts -----


# ----- Start of src/database/models/project.ts -----

import { IProject } from "../../interfaces/project";
import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    description: { type: String },
    customId: { type: String, unique: true }, // Ensure uniqueness
    prevCustomId: { type: String },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectManager",
      required: true,
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectStatus",
      required: true,
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectType",
      required: true,
    },

    task: { type: String, required: true },
    orderNumber: { type: String, required: true },
    assignmentDate: { type: Date, required: true },
    schedaRadioDate: { type: Date, required: true },
    statusHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ProjectStatus" },
    ],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Custom ID generator
ProjectSchema.pre<IProject>("save", async function (next) {
  if (!this.customId && this.isNew) {
    await this.populate("customer type");
    const customer = this.customer as any;
    const type = this.type as any;

    if (customer?.name && type?.name) {
      const key = `${customer.name.toUpperCase()}-${type.name.toUpperCase()}`; // Create a unique key

      // Find or create a sequence value for the key
      const counter = await ProjectCounterModel.findOneAndUpdate(
        { key },
        { $inc: { sequenceValue: 1 } }, // Increment the sequence value
        { new: true, upsert: true } // Create if it doesn't exist
      );

      const sequenceNumber = counter.sequenceValue.toString().padStart(5, "0"); // Pad sequence to 5 digits
      this.customId = `${key}-${sequenceNumber}`; // Construct the customId
    } else if (this.task) {
      this.customId = `${this.task.slice(0, 5).toUpperCase()}-${Date.now()}`;
    } else {
      console.warn("Incomplete data for custom ID generation.");
      this.customId = `${Date.now()}`;
    }
  }
  next();
});

const ProjectCounterSchema = new mongoose.Schema({
  key: { type: String, unique: true }, // Unique key combining customer and type
  sequenceValue: { type: Number, default: 0 }, // Incrementing sequence number
});

export const ProjectCounterModel = mongoose.model(
  "ProjectCounter",
  ProjectCounterSchema
);

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);

# ----- End of src/database/models/project.ts -----


# ----- Start of src/database/models/projectManager.ts -----

import mongoose from "mongoose";
import { IProjectManager } from "../../interfaces/projectManager";

const ProjectManagerSchema = new mongoose.Schema<IProjectManager>(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Linking to Admin
    role: { type: String, default: "projectManager" }, // Assign default role
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
/*
import bcrypt from "bcrypt";

ProjectManagerSchema.pre<IProjectManager>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
*/

export const ProjectManagerModel = mongoose.model<IProjectManager>(
  "ProjectManager",
  ProjectManagerSchema
);

# ----- End of src/database/models/projectManager.ts -----


# ----- Start of src/database/models/projectStatus.ts -----

import mongoose from "mongoose";

interface IProjectStatus extends mongoose.Document {
  _id: string;
  name: string;
  priority?: number;
}

const ProjectStatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProjectStatusModel = mongoose.model<IProjectStatus>(
  "ProjectStatus",
  ProjectStatusSchema
);

# ----- End of src/database/models/projectStatus.ts -----


# ----- Start of src/database/models/projectType.ts -----

import mongoose from "mongoose";

interface IProjectType extends mongoose.Document {
  name: string;
}

const ProjectTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const ProjectTypeModel = mongoose.model<IProjectType>("ProjectType", ProjectTypeSchema);

# ----- End of src/database/models/projectType.ts -----


# ----- Start of src/database/models/serviceCompany.ts -----

import mongoose from "mongoose";

interface IServiceCompany extends mongoose.Document {
  name: string;
  address: string;
  description?: string;
  map?: string;
  url?: string;
  isActive: boolean;
  isDeleted: boolean;
}

const ServiceCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    description: { type: String },
    map: { type: String },
    url: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ServiceCompanyModel = mongoose.model<IServiceCompany>(
  "ServiceCompany",
  ServiceCompanySchema
);

# ----- End of src/database/models/serviceCompany.ts -----


# ----- Start of src/database/models/timesheet.ts -----

import mongoose from "mongoose";
import { ITimesheet } from "../../interfaces/timesheet";

const TimesheetSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByRole",
      required: true,
    },
    createdByRole: {
      type: String,
      enum: ["Admin", "ProjectManager", "ActivityManager", "Worker"],
      required: true,
    },
    note: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    hoursSpent: { type: Number, required: false }, // Automatically calculated
    date: { type: Date, required: true },
    file: { type: String },
    isPending: { type: Boolean, default: true },
    isRejected: { type: Boolean, default: false },
    isAccepted: { type: Boolean, default: false },
    isResubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Middleware to calculate hoursSpent before saving
TimesheetSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    const startTime = new Date(this.startTime);
    const endTime = new Date(this.endTime);

    if (endTime > startTime) {
      this.hoursSpent =
        Math.abs(endTime.getTime() - startTime.getTime()) / 36e5; // Convert ms to hours
    } else {
      throw new Error("End time must be after start time");
    }
  }
  next();
});

export const TimesheetModel = mongoose.model<ITimesheet>(
  "Timesheet",
  TimesheetSchema
);

# ----- End of src/database/models/timesheet.ts -----


# ----- Start of src/database/models/worker.ts -----

import mongoose from "mongoose";
import { ServiceCompanyModel } from "./serviceCompany";

interface IWorker extends mongoose.Document {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isService: boolean;
  name: string;
  password: string;
  serviceCompany: mongoose.Schema.Types.ObjectId | typeof ServiceCompanyModel;
  role: string; // Assign default role
}

const WorkerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isService: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    serviceCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCompany",
      required: true,
    },
    role: { type: String, default: "Worker" }, // Assign default role
  },
  { timestamps: true }
);

export const WorkerModel = mongoose.model<IWorker>("Worker", WorkerSchema);

# ----- End of src/database/models/worker.ts -----


# ----- Start of src/database/repositories/activity.ts -----

import { ActivityModel } from "../models/activity";
import { logError } from "../../utils/errorLogger";
import { Request } from "express";
import path from "path";
import { Types } from "mongoose";

class ActivityRepository {
  /**
   * Get the count of activities grouped by status for a specific project.
   */
  public async getActivityCountByStatus(projectId: string) {
    try {
      return await ActivityModel.aggregate([
        {
          $match: { project: new Types.ObjectId(projectId), isDeleted: false },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "activitystatuses",
            localField: "_id",
            foreignField: "_id",
            as: "statusDetails",
          },
        },
        { $unwind: "$statusDetails" },
        {
          $project: {
            _id: "$statusDetails._id",
            status: "$statusDetails.name",
            count: 1,
          },
        },
      ]);
    } catch (error) {
      throw new Error(`Failed to get activity counts by status: ${error}`);
    }
  }

  public async getActivities(
    req: Request,
    pagination: { page: number; limit: number },
    search: string,
    filters: any
  ) {
    try {
      const query: any = { ...filters, isDeleted: false }; // Combine projectId and role-based filters
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      const totalCount = await ActivityModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;
      const activities = await ActivityModel.find(query)
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .populate("status type activityManager project worker")
        // .select("-updatedBy") // Exclude updatedBy fields
        .exec();

      return { data: activities, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivities");
      throw error;
    }
  }

  public async getActivity(req: Request, id: string) {
    try {
      return await ActivityModel.findById(id)
        .populate({
          path: "project",
          populate: "location",
        })
        .populate("worker status type activityManager")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-getActivity");
      throw error;
    }
  }

  public async createActivity(req: Request, activityData: any) {
    try {
      const newActivity = new ActivityModel(activityData);
      return await newActivity.save();
    } catch (error) {
      // await logError(error, req, "ActivityRepository-createActivity");
      throw error;
    }
  }

  public async updateActivity(req: Request, id: string, activityData: any) {
    try {
      return await ActivityModel.findByIdAndUpdate(id, activityData, {
        new: true,
      })
        .populate("project worker status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivity");
      throw error;
    }
  }

  public async updateActivityByCustomId(
    req: Request,
    customId: string,
    activityData: any
  ) {
    try {
      return await ActivityModel.findOneAndUpdate(
        { customId, isDeleted: false },
        activityData,
        { new: true }
      )
        .populate("project worker status type activityManager")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-updateActivityByCustomId");
      throw error;
    }
  }
  public async deleteActivity(req: Request, id: string) {
    try {
      return await ActivityModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        {
          new: true,
        }
      )
        .populate("project worker status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ActivityRepository-deleteActivity");
      throw error;
    }
  }

  public async bulkInsertActivities(req: Request, activities: any[]) {
    const results = { success: [], failed: [] };

    for (const activity of activities) {
      try {
        // Validate individual activity
        const isValid = this.validateActivity(activity);
        if (!isValid) {
          continue;
        }

        // Insert into database
        const newActivity = new ActivityModel(activity);
        await newActivity.save();
      } catch (error) {
        await logError(error, req, "ActivityRepository-bulkInsertActivities");
      }
    }

    return results;
  }

  /**
   * Validate an activity.
   */
  private validateActivity(activity: any): boolean {
    if (!activity.title || !activity.description || !activity.project) {
      return false;
    }
    // Add additional validation rules as needed
    return true;
  }
}

export default ActivityRepository;

# ----- End of src/database/repositories/activity.ts -----


# ----- Start of src/database/repositories/activityFile.ts -----

// src/database/repositories/ActivityFileRepository.ts

import ActivityFileModel from "../../database/models/activityFile";
import { IActivityFile } from "../../interfaces/activityFile";

class ActivityFileRepository {
  async findByActivityId(activityId: string): Promise<IActivityFile | any> {
    return ActivityFileModel.findOne({ activityId }).populate("files.file");
  }

  async create(data: Partial<IActivityFile>): Promise<IActivityFile | any> {
    return ActivityFileModel.create(data);
  }

  async update(
    activityFileId: string,
    updateData: Partial<IActivityFile>
  ): Promise<IActivityFile | null> {
    return ActivityFileModel.findByIdAndUpdate(activityFileId, updateData, {
      new: true,
    });
  }
}

export default new ActivityFileRepository();

# ----- End of src/database/repositories/activityFile.ts -----


# ----- Start of src/database/repositories/activityManager.ts -----

import { Request } from "express";
import { ActivityManagerModel } from "../models/activityManager";
import {
  ICreateActivityManager,
  IUpdateActivityManager,
} from "../../interfaces/activityManager";
import { logError } from "../../utils/errorLogger";
import { IActivityManager } from "../../interfaces/activityManager";
import mongoose from "mongoose";

class ActivityManagerRepository {
  public async getActivityManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IActivityManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ActivityManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const activityManagers = await ActivityManagerModel.find(query)
        .populate("admin", "_id name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: activityManagers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerRepository-getActivityManagers"
      );
      throw error;
    }
  }

  public async getActivityManagerById(
    req: Request,
    id: string
  ): Promise<IActivityManager> {
    try {
      const activityManagerDoc = await ActivityManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin");

      if (!activityManagerDoc) {
        throw new Error("ActivityManager not found");
      }

      return activityManagerDoc;
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerRepository-getActivityManagerById"
      );
      throw error;
    }
  }

  public async createActivityManager(
    req: Request,
    activityManagerData: ICreateActivityManager
  ): Promise<IActivityManager> {
    try {
      const newActivityManager = await ActivityManagerModel.create(
        activityManagerData
      );
      return newActivityManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerRepository-createActivityManager"
      );
      throw error;
    }
  }

  public async updateActivityManager(
    req: Request,
    id: string,
    activityManagerData: Partial<IUpdateActivityManager>
  ) {
    try {
      const updatedActivityManager =
        await ActivityManagerModel.findOneAndUpdate(
          { _id: id },
          activityManagerData,
          {
            new: true,
          }
        ).populate("admin", "_id name");

      if (!updatedActivityManager) {
        throw new Error("Failed to update ActivityManager");
      }
      return updatedActivityManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerRepository-updateActivityManager"
      );
      throw error;
    }
  }

  public async deleteActivityManager(
    req: Request,
    id: string
  ): Promise<IActivityManager> {
    try {
      const deletedActivityManager =
        await ActivityManagerModel.findOneAndUpdate(
          { _id: id, isDeleted: false },
          { isDeleted: true },
          { new: true }
        ).populate("admin", "name");
      if (!deletedActivityManager) {
        throw new Error("Failed to delete ActivityManager");
      }
      return deletedActivityManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerRepository-deleteActivityManager"
      );
      throw error;
    }
  }
}

export default ActivityManagerRepository;

# ----- End of src/database/repositories/activityManager.ts -----


# ----- Start of src/database/repositories/activityStatus.ts -----

import { Request } from "express";
import { ActivityStatusModel } from "../models/activityStatus";
import { IActivityStatus, ICreateActivityStatus, IUpdateActivityStatus } from "../../interfaces/activityStatus";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ActivityStatusRepository {
  public async getActivityStatuses(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IActivityStatus[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const activityStatuses = await ActivityStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IActivityStatus[]>();

      const totalCount = await ActivityStatusModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: activityStatuses,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-getActivityStatuses");
      throw error;
    }
  }

  public async getActivityStatusById(req: Request, id: string): Promise<IActivityStatus> {
    try {
      const activityStatus = await ActivityStatusModel.findById(id).lean<IActivityStatus>();
      if (!activityStatus || activityStatus.isDeleted) {
        throw new Error("ActivityStatus not found");
      }
      return activityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-getActivityStatusById");
      throw error;
    }
  }

  public async createActivityStatus(
    req: Request,
    activityStatusData: ICreateActivityStatus
  ): Promise<IActivityStatus> {
    try {
      const newActivityStatus = await ActivityStatusModel.create(activityStatusData);
      return newActivityStatus.toObject() as IActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-createActivityStatus");
      throw error;
    }
  }

  public async updateActivityStatus(
    req: Request,
    id: string,
    activityStatusData: IUpdateActivityStatus
  ): Promise<IActivityStatus> {
    try {
      const updatedActivityStatus = await ActivityStatusModel.findByIdAndUpdate(id, activityStatusData, {
        new: true,
      }).lean<IActivityStatus>();
      if (!updatedActivityStatus || updatedActivityStatus.isDeleted) {
        throw new Error("Failed to update ActivityStatus");
      }
      return updatedActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-updateActivityStatus");
      throw error;
    }
  }

  public async deleteActivityStatus(req: Request, id: string): Promise<IActivityStatus> {
    try {
      const deletedActivityStatus = await ActivityStatusModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).lean<IActivityStatus>();
      if (!deletedActivityStatus) {
        throw new Error("Failed to delete ActivityStatus");
      }
      return deletedActivityStatus;
    } catch (error) {
      await logError(error, req, "ActivityStatusRepository-deleteActivityStatus");
      throw error;
    }
  }
}

export default ActivityStatusRepository;

# ----- End of src/database/repositories/activityStatus.ts -----


# ----- Start of src/database/repositories/activityType.ts -----

import { Request } from "express";
import { ActivityTypeModel } from "../models/activityType";
import {
  IActivityType,
  ICreateActivityType,
  IUpdateActivityType,
} from "../../interfaces/activityType";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ActivityTypeRepository {
  public async getActivityTypes(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IActivityType[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const activityTypesDoc = await ActivityTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const activityTypes = activityTypesDoc.map((doc) => doc.toObject() as IActivityType);

      const totalCount = await ActivityTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: activityTypes,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-getActivityTypes");
      throw error;
    }
  }

  public async getActivityTypeById(req: Request, id: string): Promise<IActivityType> {
    try {
      const activityTypeDoc = await ActivityTypeModel.findById(id);

      if (!activityTypeDoc) {
        throw new Error("ActivityType not found");
      }

      return activityTypeDoc.toObject() as IActivityType;
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-getActivityTypeById");
      throw error;
    }
  }

  public async createActivityType(
    req: Request,
    activityTypeData: ICreateActivityType
  ): Promise<IActivityType> {
    try {
      const newActivityType = await ActivityTypeModel.create(activityTypeData);
      return newActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-createActivityType");
      throw error;
    }
  }

  public async updateActivityType(
    req: Request,
    id: string,
    activityTypeData: Partial<IUpdateActivityType>
  ): Promise<IActivityType> {
    try {
      const updatedActivityType = await ActivityTypeModel.findByIdAndUpdate(
        id,
        activityTypeData,
        { new: true }
      );
      if (!updatedActivityType) {
        throw new Error("Failed to update ActivityType");
      }
      return updatedActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-updateActivityType");
      throw error;
    }
  }

  public async deleteActivityType(req: Request, id: string): Promise<IActivityType> {
    try {
      const deletedActivityType = await ActivityTypeModel.findByIdAndDelete(id);
      if (!deletedActivityType) {
        throw new Error("Failed to delete ActivityType");
      }
      return deletedActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-deleteActivityType");
      throw error;
    }
  }
}

export default ActivityTypeRepository;

# ----- End of src/database/repositories/activityType.ts -----


# ----- Start of src/database/repositories/admin.ts -----

import { Request } from "express";
import { AdminModel } from "../models/admin";
import { IAdmin, ICreateAdmin, IUpdateAdmin } from "../../interfaces/admin";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class AdminRepository {
  public async getAdminByEmail(
    req: Request,
    email: string
  ): Promise<IAdmin | null> {
    try {
      const admin = await AdminModel.findOne({
        email,
        isDeleted: false,
      }).lean<IAdmin>();
      return admin;
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdminByEmail");
      throw error;
    }
  }

  public async getAdmins(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IAdmin[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = { isDeleted: false };
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
      const admins = await AdminModel.find(query)
        .select("-password")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IAdmin[]>();

      const totalCount = await AdminModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: admins,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdmins");
      throw error;
    }
  }

  public async getAdminById(req: Request, id: string): Promise<IAdmin> {
    try {
      const admin = await AdminModel.findById(id)
        .select("-password")
        .lean<IAdmin>();
      if (!admin || admin.isDeleted) {
        throw new Error("Admin not found");
      }
      return admin;
    } catch (error) {
      await logError(error, req, "AdminRepository-getAdminById");
      throw error;
    }
  }

  public async createAdmin(
    req: Request,
    adminData: ICreateAdmin
  ): Promise<IAdmin> {
    try {
      const newAdmin = await AdminModel.create(adminData);
      return newAdmin.toObject() as any;
    } catch (error) {
      await logError(error, req, "AdminRepository-createAdmin");
      throw error;
    }
  }

  public async updateAdmin(
    req: Request,
    id: string,
    adminData: IUpdateAdmin
  ): Promise<IAdmin> {
    try {
      const updatedAdmin = await AdminModel.findByIdAndUpdate(id, adminData, {
        new: true,
      }).lean<IAdmin>();
      if (!updatedAdmin || updatedAdmin.isDeleted) {
        throw new Error("Failed to update admin");
      }
      return updatedAdmin;
    } catch (error) {
      await logError(error, req, "AdminRepository-updateAdmin");
      throw error;
    }
  }

  public async deleteAdmin(req: Request, id: string): Promise<IAdmin> {
    try {
      const deletedAdmin = await AdminModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).lean<IAdmin>();
      if (!deletedAdmin) {
        throw new Error("Failed to delete admin");
      }
      return deletedAdmin;
    } catch (error) {
      await logError(error, req, "AdminRepository-deleteAdmin");
      throw error;
    }
  }
}

export default AdminRepository;

# ----- End of src/database/repositories/admin.ts -----


# ----- Start of src/database/repositories/customer.ts -----

import { Request } from "express";
import { CustomerModel } from "../models/customer";
import {
  ICustomer,
  ICreateCustomer,
  IUpdateCustomer,
} from "../../interfaces/customer";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class CustomerRepository {
  public async getCustomers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ICustomer[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const customersDoc = await CustomerModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const customers = customersDoc.map((doc) => doc.toObject() as ICustomer);

      const totalCount = await CustomerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: customers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "CustomerRepository-getCustomers");
      throw error;
    }
  }

  public async getCustomerById(req: Request, id: string): Promise<ICustomer> {
    try {
      const customerDoc = await CustomerModel.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!customerDoc) {
        throw new Error("Customer not found");
      }

      const customer = customerDoc.toObject() as ICustomer;

      return customer;
    } catch (error) {
      await logError(error, req, "CustomerRepository-getCustomerById");
      throw error;
    }
  }

  public async createCustomer(
    req: Request,
    customerData: ICreateCustomer
  ): Promise<ICustomer> {
    try {
      const newCustomer = await CustomerModel.create(customerData);
      return newCustomer.toObject() as ICustomer;
    } catch (error) {
      await logError(error, req, "CustomerRepository-createCustomer");
      throw error;
    }
  }

  public async updateCustomer(
    req: Request,
    id: string,
    customerData: Partial<IUpdateCustomer>
  ): Promise<ICustomer> {
    try {
      const updatedCustomer = await CustomerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        customerData,
        { new: true }
      );
      if (!updatedCustomer) {
        throw new Error("Failed to update customer");
      }
      return updatedCustomer.toObject() as ICustomer;
    } catch (error) {
      await logError(error, req, "CustomerRepository-updateCustomer");
      throw error;
    }
  }

  public async deleteCustomer(req: Request, id: string): Promise<ICustomer> {
    try {
      const deletedCustomer = await CustomerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      );
      if (!deletedCustomer) {
        throw new Error("Failed to delete customer");
      }
      return deletedCustomer.toObject() as ICustomer;
    } catch (error) {
      await logError(error, req, "CustomerRepository-deleteCustomer");
      throw error;
    }
  }
}

export default CustomerRepository;

# ----- End of src/database/repositories/customer.ts -----


# ----- Start of src/database/repositories/error.ts -----

import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IError } from "../../interfaces/error";
import { ErrorModel } from "../models/error";
import { IPagination } from "../../interfaces/pagination";

class ErrorRepository {
  public async getErrors(
    req: Request,
    pagination: IPagination
  ): Promise<{
    errors: IError[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const errors = await ErrorModel.find()
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await ErrorModel.countDocuments();
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        errors,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ErrorService-getErrors");
      throw new Error("Error retrieval failed");
    }
  }

  public async resolveError(req: Request, id: string): Promise<IError | null> {
    try {
      return await ErrorModel.findByIdAndUpdate(
        id,
        { $set: { resolved: true } },
        { new: true }
      );
    } catch (error) {
      await logError(error, req, "ErrorService-resolveError");
      throw new Error("Error resolution failed");
    }
  }

  public async deleteError(req: Request, id: string): Promise<IError | null> {
    try {
      return await ErrorModel.findByIdAndDelete(id);
    } catch (error) {
      await logError(error, req, "ErrorService-deleteError");
      throw new Error("Error deletion failed");
    }
  }

  public async batchDeleteErrors(
    req: Request,
    ids: string[]
  ): Promise<IError[]> {
    try {
      const result = await ErrorModel.deleteMany({ _id: { $in: ids } });
      return result.deletedCount > 0
        ? ids.map((id) => ({ _id: id } as unknown as IError))
        : [];
    } catch (error) {
      await logError(error, req, "ErrorService-batchDeleteErrors");
      throw new Error("Batch error deletion failed");
    }
  }
}

export default ErrorRepository;

# ----- End of src/database/repositories/error.ts -----


# ----- Start of src/database/repositories/exampleRepository.ts -----

import { Request } from "express";
import { IExampleInterface } from "../../interfaces/exampleInterface";
import { IPagination } from "../../interfaces/pagination";
import { logError } from "../../utils/errorLogger";
import Example from "../models/exampleModel";

class ExampleRepository {
  public async getExamples(
    req: Request,
    pagination: IPagination
  ): Promise<{
    examples: IExampleInterface[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const examples = await Example.find()
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await Example.countDocuments();
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return { examples, totalCount, currentPage: pagination.page,totalPages:totalPages };
    } catch (error) {
      await logError(error, req, "Repository-getExamples");
      throw new Error("Example retrieval failed");
    }
  }

  public async createExample(
    req: Request,
    example: IExampleInterface
  ): Promise<IExampleInterface> {
    try {
      const newExample = new Example(example);
      return await newExample.save();
    } catch (error) {
      await logError(error, req, "Repository-createExample");
      throw new Error("Example creation failed");
    }
  }

  public async updateExample(
    req: Request,
    id: string,
    example: Partial<IExampleInterface>
  ): Promise<IExampleInterface | null> {
    try {
      return await Example.findByIdAndUpdate(
        id,
        { $set: example },
        { new: true }
      );
    } catch (error) {
      await logError(error, req, "Repository-updateExample");
      throw new Error("Example update failed");
    }
  }

  public async deleteExample(
    req: Request,
    id: string
  ): Promise<IExampleInterface | null> {
    try {
      return await Example.findByIdAndDelete(id);
    } catch (error) {
      await logError(error, req, "Repository-deleteExample");
      throw new Error("Example deletion failed");
    }
  }

  public async findExampleById(
    req: Request,
    id: string
  ): Promise<IExampleInterface | null> {
    try {
      return await Example.findById(id);
    } catch (error) {
      await logError(error, req, "Repository-findExampleById");
      throw new Error("Example retrieval failed");
    }
  }
}

export default ExampleRepository;

# ----- End of src/database/repositories/exampleRepository.ts -----


# ----- Start of src/database/repositories/file.ts -----

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

# ----- End of src/database/repositories/file.ts -----


# ----- Start of src/database/repositories/location.ts -----

import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { ILocation } from "../../interfaces/location";
import { LocationModel } from "../../database/models/location";
import { LocationManagerModel } from "@database/models/locationManager";

class LocationRepository {
  public async getLocations(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ) {
    try {
      const query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await LocationModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const locations = await LocationModel.find(query)
        .populate({
          path: "locationManagers.manager",
          select: "name", // Only include manager's name
        })
        .populate("locationType")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: locations, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocations");
      throw error;
    }
  }

  public async getLocationById(req: Request, id: string): Promise<ILocation> {
    try {
      const location = await LocationModel.findById(id)
        .populate({
          path: "locationManagers.manager",
          select: "name", // Only include manager's name
        })
        .populate("locationType", "name");
      if (!location) {
        throw new Error("Location not found");
      }
      return location;
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocationById");
      throw error;
    }
  }

  public async createLocation(
    req: Request,
    locationData: Partial<ILocation>
  ): Promise<ILocation> {
    try {
      const newLocation = await LocationModel.create(locationData);
      return newLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-createLocation");
      throw error;
    }
  }

  public async updateLocation(
    req: Request,
    id: string,
    locationData: Partial<ILocation>
  ): Promise<ILocation> {
    try {
      const updatedLocation = await LocationModel.findByIdAndUpdate(
        id,
        locationData,
        { new: true }
      )
        .populate({
          path: "locationManagers.manager",
          select: "name",
        })
        .populate("locationType", "name");
      if (!updatedLocation) {
        throw new Error("Failed to update location");
      }
      return updatedLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-updateLocation");
      throw error;
    }
  }

  public async deleteLocation(req: Request, id: string): Promise<ILocation> {
    try {
      const deletedLocation = await LocationModel.findByIdAndDelete(
        id
      ).populate("locationType", "name");
      if (!deletedLocation) {
        throw new Error("Failed to delete location");
      }
      return deletedLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-deleteLocation");
      throw error;
    }
  }
}

export default LocationRepository;

# ----- End of src/database/repositories/location.ts -----


# ----- Start of src/database/repositories/locationManager.ts -----

import { Request } from "express";
import { LocationManagerModel } from "../models/locationManager";
import {
  ILocationManager,
  ICreateLocationManager,
  IUpdateLocationManager,
} from "../../interfaces/locationManager";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class LocationManagerRepository {
  public async getLocationManagers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ILocationManager[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const locationManagersDoc = await LocationManagerModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const locationManagers = locationManagersDoc.map(
        (doc) => doc.toObject() as any
      );

      const totalCount = await LocationManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: locationManagers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-getLocationManagers"
      );
      throw error;
    }
  }

  public async getLocationManagerById(
    req: Request,
    id: string
  ): Promise<ILocationManager> {
    try {
      const locationManagerDoc = await LocationManagerModel.findById(id);

      if (!locationManagerDoc) {
        throw new Error("LocationManager not found");
      }

      return locationManagerDoc.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-getLocationManagerById"
      );
      throw error;
    }
  }

  public async createLocationManager(
    req: Request,
    locationManagerData: ICreateLocationManager
  ): Promise<ILocationManager> {
    try {
      const newLocationManager = await LocationManagerModel.create(
        locationManagerData
      );
      return newLocationManager.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-createLocationManager"
      );
      throw error;
    }
  }

  public async updateLocationManager(
    req: Request,
    id: string,
    locationManagerData: Partial<IUpdateLocationManager>
  ): Promise<ILocationManager> {
    try {
      const updatedLocationManager =
        await LocationManagerModel.findByIdAndUpdate(id, locationManagerData, {
          new: true,
        }).populate("location");
      if (!updatedLocationManager) {
        throw new Error("Failed to update LocationManager");
      }
      return updatedLocationManager.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-updateLocationManager"
      );
      throw error;
    }
  }

  public async deleteLocationManager(
    req: Request,
    id: string
  ): Promise<ILocationManager> {
    try {
      const deletedLocationManager =
        await LocationManagerModel.findByIdAndDelete(id);
      if (!deletedLocationManager) {
        throw new Error("Failed to delete LocationManager");
      }
      return deletedLocationManager.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-deleteLocationManager"
      );
      throw error;
    }
  }
}

export default LocationManagerRepository;

# ----- End of src/database/repositories/locationManager.ts -----


# ----- Start of src/database/repositories/locationType.ts -----

import { Request } from "express";
import { LocationTypeModel } from "../models/locationType";
import {} from "../../interfaces/locationType";
import { logError } from "../../utils/errorLogger";
import { ILocationType } from "../../interfaces/locationType";

class LocationTypeRepository {
  public async getLocationTypes(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: ILocationType[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await LocationTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;
      console.log(totalCount);
      console.log(totalPages);
      console.log(currentPage);

      const locationTypes = await LocationTypeModel.find(query);

      console.log(locationTypes);

      return { data: locationTypes, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypes");
      throw error;
    }
  }

  public async getLocationTypeById(
    req: Request,
    id: string
  ): Promise<ILocationType> {
    try {
      const locationTypeDoc = await LocationTypeModel.findOne({
        _id: id,
      });

      if (!locationTypeDoc) {
        throw new Error("Location Type not found");
      }

      return locationTypeDoc;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypeById");
      throw error;
    }
  }

  public async createLocationType(
    req: Request,
    locationTypeData: any
  ): Promise<ILocationType> {
    try {
      console.log(locationTypeData);

      const newLocationType = await LocationTypeModel.create(locationTypeData);
      return newLocationType;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-createLocationType");
      throw error;
    }
  }

  public async updateLocationType(
    req: Request,
    id: string,
    locationTypeData: Partial<ILocationType>
  ): Promise<ILocationType> {
    try {
      const updatedLocationType = await LocationTypeModel.findOneAndUpdate(
        { _id: id },
        locationTypeData,
        { new: true }
      );
      if (!updatedLocationType) {
        throw new Error("Failed to update Location Type");
      }
      return updatedLocationType;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-updateLocationType");
      throw error;
    }
  }

  public async deleteLocationType(
    req: Request,
    id: string
  ): Promise<ILocationType> {
    try {
      const deletedLocationType = await LocationTypeModel.findByIdAndDelete({
        _id: id,
      });
      if (!deletedLocationType) {
        throw new Error("Failed to delete Location Type");
      }
      return deletedLocationType;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-deleteLocationType");
      throw error;
    }
  }
}

export default LocationTypeRepository;

# ----- End of src/database/repositories/locationType.ts -----


# ----- Start of src/database/repositories/manager.ts -----

import { Request } from "express";
import { ManagerModel } from "../models/manager";
import { ICreateManager, IUpdateManager } from "../../interfaces/manager";
import { logError } from "../../utils/errorLogger";
import { IManager } from "../../interfaces/manager";

class ManagerRepository {
  public async getManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const managers = await ManagerModel.find(query)
        .populate("admin", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: managers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagers");
      throw error;
    }
  }

  public async getManagerById(req: Request, id: string): Promise<IManager> {
    try {
      const managerDoc = await ManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "name");

      if (!managerDoc) {
        throw new Error("Manager not found");
      }

      return managerDoc;
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagerById");
      throw error;
    }
  }

  public async createManager(
    req: Request,
    managerData: ICreateManager
  ): Promise<IManager> {
    try {
      const newManager = await ManagerModel.create(managerData);
      return newManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-createManager");
      throw error;
    }
  }

  public async updateManager(
    req: Request,
    id: string,
    managerData: Partial<IUpdateManager>
  ): Promise<IManager> {
    try {
      const updatedManager = await ManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        managerData,
        { new: true }
      ).populate("admin", "name");
      if (!updatedManager) {
        throw new Error("Failed to update manager");
      }
      return updatedManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-updateManager");
      throw error;
    }
  }

  public async deleteManager(req: Request, id: string): Promise<IManager> {
    try {
      const deletedManager = await ManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "name");
      if (!deletedManager) {
        throw new Error("Failed to delete manager");
      }
      return deletedManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-deleteManager");
      throw error;
    }
  }
}

export default ManagerRepository;

# ----- End of src/database/repositories/manager.ts -----


# ----- Start of src/database/repositories/project.ts -----

import { Request } from "express";
import { ProjectModel } from "../models/project";
import { logError } from "../../utils/errorLogger";
import { IProject } from "@interfaces/project";
import mongoose from "mongoose";

class ProjectRepository {
  public async getProjectCountByStatus(req: Request, query: any) {
    try {
      // Ensure any _id fields in the query are properly cast to ObjectId
      if (query._id) {
        if (Array.isArray(query._id.$in)) {
          query._id.$in = query._id.$in.map(
            (id: any) => new mongoose.Types.ObjectId(id)
          );
        } else {
          query._id = new mongoose.Types.ObjectId(query._id);
        }
      }

      if (query.status) {
        query.status = new mongoose.Types.ObjectId(query.status);
      }

      // Aggregation pipeline
      const countResult = await ProjectModel.aggregate([
        { $match: { ...query, isDeleted: false } }, // Apply filters and exclude deleted projects
        {
          $group: {
            _id: "$status", // Group by the status field
            count: { $sum: 1 }, // Count the number of projects for each status
          },
        },
        {
          $lookup: {
            from: "projectstatuses", // Lookup the ProjectStatus collection
            localField: "_id", // _id from the previous group stage (status)
            foreignField: "_id", // Match with _id in the ProjectStatus collection
            as: "statusDetails", // Output the result as statusDetails
          },
        },
        { $unwind: "$statusDetails" }, // Flatten the statusDetails array
        {
          $project: {
            status: "$statusDetails.name", // Project the status name
            count: 1, // Include the count
          },
        },
      ]);

      return countResult;
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjectCountByStatus");
      throw error;
    }
  }

  // GET all projects
  public async getProjects(
    req: Request,
    pagination: { page: number; limit: number },
    query: any
  ) {
    try {
      // Count total matching documents
      const totalCount = await ProjectModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;
      // Fetch projects with pagination and population
      const projects = await ProjectModel.find(query)
        .populate("status customer projectManager location type")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: projects, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProjects");
      throw error;
    }
  }

  public async getProject(req: Request, query: any) {
    try {
      return await ProjectModel.findById(query)
        .populate({
          path: "location",
          populate: {
            path: "locationManagers.manager", // Path to populate locationManager names
            select: "name", // Include only the manager's name field
          },
        })
        .populate("status customer projectManager type") // Other population fields
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-getProject");
      throw error;
    }
  }

  public async createProject(req: Request, projectData: any) {
    // try {
    //   console.log(projectData);
    //   console.log("Its on Repos");
    //   const newProject = new ProjectModel(projectData);
    //   console.log("Yo");
    //   return newProject;
    // } catch (error) {
    //   await logError(error, req, "ProjectRepository-createProject");
    //   throw error;
    // }
    try {
      const newProject = await ProjectModel.create(projectData);
      return newProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-createProject");
      throw error;
    }
  }

  public async updateProject(req: Request, id: string, projectData: any) {
    try {
      return await ProjectModel.findByIdAndUpdate(id, projectData, {
        new: true,
      })
        .populate("customer projectManager location status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProject");
      throw error;
    }
  }
  public async updateProjectStatus(
    req: Request,
    projectId: string,
    newStatusId: any
  ) {
    try {
      const project = await ProjectModel.findById(projectId);
      if (!project) throw new Error("Project not found");

      // Update the project's status
      project.status = newStatusId;

      // Save the updated project
      const updatedProject = await project.save();

      // Trigger any side effects (e.g., notifications, dependent logic)
      console.log(`Project status updated to ${newStatusId} successfully`);

      return updatedProject;
    } catch (error) {
      await logError(error, req, "ProjectRepository-updateProjectStatus");
      throw error;
    }
  }

  public async deleteProject(req: Request, id: string) {
    try {
      return await ProjectModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("customer projectManager location status type")
        .exec();
    } catch (error) {
      await logError(error, req, "ProjectRepository-deleteProject");
      throw error;
    }
  }

  public async bulkInsertProjects(req: Request, projects: any[]) {
    const results = { success: [], failed: [] };

    for (const project of projects) {
      try {
        // Create a new project document
        const newProject = new ProjectModel(project);
        await newProject.save();

        results.success.push();
      } catch (error) {
        await logError(error, req, "ProjectRepository-bulkInsertProjects");
        results.failed.push();
      }
    }

    return results;
  }
}

export default ProjectRepository;

# ----- End of src/database/repositories/project.ts -----


# ----- Start of src/database/repositories/projectManager.ts -----

import { Request } from "express";
import { ProjectManagerModel } from "../models/projectManager";
import {
  ICreateProjectManager,
  IUpdateProjectManager,
} from "../../interfaces/projectManager";
import { logError } from "../../utils/errorLogger";
import { IProjectManager } from "../../interfaces/projectManager";

class ProjectManagerRepository {
  public async getProjectManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IProjectManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ProjectManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const projectManagers = await ProjectManagerModel.find(query)
        .populate("admin", "_id name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: projectManagers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ProjectManagerRepository-getProjectManagers");
      throw error;
    }
  }

  public async getProjectManagerById(
    req: Request,
    id: string
  ): Promise<IProjectManager> {
    try {
      const projectManagerDoc = await ProjectManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "_id name");

      if (!projectManagerDoc) {
        throw new Error("ProjectManager not found");
      }

      return projectManagerDoc;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectManagerRepository-getProjectManagerById"
      );
      throw error;
    }
  }

  public async createProjectManager(
    req: Request,
    projectManagerData: ICreateProjectManager
  ): Promise<IProjectManager> {
    try {
      const newProjectManager = await ProjectManagerModel.create(
        projectManagerData
      );
      return newProjectManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectManagerRepository-createProjectManager"
      );
      throw error;
    }
  }

  public async updateProjectManager(
    req: Request,
    id: string,
    projectManagerData: Partial<IUpdateProjectManager>
  ): Promise<IProjectManager> {
    try {
      const updatedProjectManager = await ProjectManagerModel.findOneAndUpdate(
        { _id: id },
        projectManagerData,
        {
          new: true,
        }
      ).populate("admin", "_id name");

      if (!updatedProjectManager) {
        throw new Error("Failed to update ProjectManager");
      }
      return updatedProjectManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectManagerRepository-updateProjectManager"
      );
      throw error;
    }
  }

  public async deleteProjectManager(
    req: Request,
    id: string
  ): Promise<IProjectManager> {
    try {
      const deletedProjectManager = await ProjectManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "_id name");
      if (!deletedProjectManager) {
        throw new Error("Failed to delete ProjectManager");
      }
      return deletedProjectManager;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectManagerRepository-deleteProjectManager"
      );
      throw error;
    }
  }
}

export default ProjectManagerRepository;

# ----- End of src/database/repositories/projectManager.ts -----


# ----- Start of src/database/repositories/projectStatus.ts -----

// src/database/repositories/projectStatus.ts
import { Request } from "express";
import { ProjectStatusModel } from "../models/projectStatus";
import {
  IProjectStatus,
  ICreateProjectStatus,
  IUpdateProjectStatus,
} from "../../interfaces/projectStatus";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectStatusRepository {
  public async getProjectStatuses(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProjectStatus[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const projectStatuses = await ProjectStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<IProjectStatus[]>();

      const totalCount = await ProjectStatusModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: projectStatuses,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-getProjectStatuses");
      throw error;
    }
  }

  public async getProjectStatusById(
    req: Request,
    id: string
  ): Promise<IProjectStatus> {
    try {
      const projectStatus = await ProjectStatusModel.findById(
        id
      ).lean<IProjectStatus>();
      if (!projectStatus) {
        throw new Error("ProjectStatus not found");
      }
      return projectStatus;
    } catch (error) {
      await logError(
        error,
        req,
        "ProjectStatusRepository-getProjectStatusById"
      );
      throw error;
    }
  }

  public async createProjectStatus(
    req: Request,
    projectStatusData: ICreateProjectStatus
  ): Promise<IProjectStatus> {
    try {
      const newProjectStatus = await ProjectStatusModel.create(
        projectStatusData
      );
      return newProjectStatus.toObject() as IProjectStatus;
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-createProjectStatus");
      throw error;
    }
  }

  public async updateProjectStatus(
    req: Request,
    id: string,
    projectStatusData: Partial<IUpdateProjectStatus>
  ): Promise<IProjectStatus> {
    try {
      const updatedProjectStatus = await ProjectStatusModel.findByIdAndUpdate(
        id,
        projectStatusData,
        {
          new: true,
        }
      ).lean<IProjectStatus>();
      if (!updatedProjectStatus) {
        throw new Error("Failed to update project status");
      }
      return updatedProjectStatus;
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-updateProjectStatus");
      throw error;
    }
  }

  public async deleteProjectStatus(
    req: Request,
    id: string
  ): Promise<IProjectStatus> {
    try {
      const deletedProjectStatus = await ProjectStatusModel.findByIdAndDelete(
        id
      ).lean<IProjectStatus>();
      if (!deletedProjectStatus) {
        throw new Error("Failed to delete project status");
      }
      return deletedProjectStatus;
    } catch (error) {
      await logError(error, req, "ProjectStatusRepository-deleteProjectStatus");
      throw error;
    }
  }
}

export default ProjectStatusRepository;

# ----- End of src/database/repositories/projectStatus.ts -----


# ----- Start of src/database/repositories/projectType.ts -----

import { Request } from "express";
import { ProjectTypeModel } from "../models/projectType";
import {
  IProjectType,
  ICreateProjectType,
  IUpdateProjectType,
} from "../../interfaces/projectType";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProjectTypeRepository {
  public async getProjectTypes(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IProjectType[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const projectTypesDoc = await ProjectTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      console.log(projectTypesDoc);

      const projectTypes = projectTypesDoc.map(
        (doc) => doc.toObject() as IProjectType
      );

      const totalCount = await ProjectTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: projectTypes,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-getProjectTypes");
      throw error;
    }
  }

  public async getProjectTypeById(
    req: Request,
    id: string
  ): Promise<IProjectType> {
    try {
      const projectTypeDoc = await ProjectTypeModel.findById(id);

      if (!projectTypeDoc) {
        throw new Error("ProjectType not found");
      }

      return projectTypeDoc.toObject() as IProjectType;
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-getProjectTypeById");
      throw error;
    }
  }

  public async createProjectType(
    req: Request,
    projectTypeData: ICreateProjectType
  ): Promise<IProjectType> {
    try {
      const newProjectType = await ProjectTypeModel.create(projectTypeData);
      return newProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-createProjectType");
      throw error;
    }
  }

  public async updateProjectType(
    req: Request,
    id: string,
    projectTypeData: Partial<IUpdateProjectType>
  ): Promise<IProjectType> {
    try {
      const updatedProjectType = await ProjectTypeModel.findByIdAndUpdate(
        id,
        projectTypeData,
        { new: true }
      );
      if (!updatedProjectType) {
        throw new Error("Failed to update ProjectType");
      }
      return updatedProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-updateProjectType");
      throw error;
    }
  }

  public async deleteProjectType(
    req: Request,
    id: string
  ): Promise<IProjectType> {
    try {
      const deletedProjectType = await ProjectTypeModel.findByIdAndDelete(id);
      if (!deletedProjectType) {
        throw new Error("Failed to delete ProjectType");
      }
      return deletedProjectType.toObject();
    } catch (error) {
      await logError(error, req, "ProjectTypeRepository-deleteProjectType");
      throw error;
    }
  }
}

export default ProjectTypeRepository;

# ----- End of src/database/repositories/projectType.ts -----


# ----- Start of src/database/repositories/serviceCompany.ts -----

import { Request } from 'express';
import { ServiceCompanyModel } from '../models/serviceCompany';
import {
  IServiceCompany,
  ICreateServiceCompany,
  IUpdateServiceCompany,
} from '../../interfaces/serviceCompany';
import { logError } from '../../utils/errorLogger';
import { IPagination } from '../../interfaces/pagination';

class ServiceCompanyRepository {
  public async getServiceCompanies(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IServiceCompany[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      const serviceCompaniesDoc = await ServiceCompanyModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const serviceCompanies = serviceCompaniesDoc.map((doc) => doc.toObject() as IServiceCompany);

      const totalCount = await ServiceCompanyModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: serviceCompanies,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, 'ServiceCompanyRepository-getServiceCompanies');
      throw error;
    }
  }

  public async getServiceCompanyById(req: Request, id: string): Promise<IServiceCompany> {
    try {
      const serviceCompanyDoc = await ServiceCompanyModel.findById(id);

      if (!serviceCompanyDoc) {
        throw new Error('ServiceCompany not found');
      }

      return serviceCompanyDoc.toObject() as IServiceCompany;
    } catch (error) {
      await logError(error, req, 'ServiceCompanyRepository-getServiceCompanyById');
      throw error;
    }
  }

  public async createServiceCompany(
    req: Request,
    serviceCompanyData: ICreateServiceCompany
  ): Promise<IServiceCompany> {
    try {
      const newServiceCompany = await ServiceCompanyModel.create(serviceCompanyData);
      return newServiceCompany.toObject();
    } catch (error) {
      await logError(error, req, 'ServiceCompanyRepository-createServiceCompany');
      throw error;
    }
  }

  public async updateServiceCompany(
    req: Request,
    id: string,
    serviceCompanyData: Partial<IUpdateServiceCompany>
  ): Promise<IServiceCompany> {
    try {
      const updatedServiceCompany = await ServiceCompanyModel.findByIdAndUpdate(
        id,
        serviceCompanyData,
        { new: true }
      );
      if (!updatedServiceCompany) {
        throw new Error('Failed to update ServiceCompany');
      }
      return updatedServiceCompany.toObject();
    } catch (error) {
      await logError(error, req, 'ServiceCompanyRepository-updateServiceCompany');
      throw error;
    }
  }

  public async deleteServiceCompany(req: Request, id: string): Promise<IServiceCompany> {
    try {
      const deletedServiceCompany = await ServiceCompanyModel.findByIdAndDelete(id);
      if (!deletedServiceCompany) {
        throw new Error('Failed to delete ServiceCompany');
      }
      return deletedServiceCompany.toObject();
    } catch (error) {
      await logError(error, req, 'ServiceCompanyRepository-deleteServiceCompany');
      throw error;
    }
  }
}

export default ServiceCompanyRepository;


# ----- End of src/database/repositories/serviceCompany.ts -----


# ----- Start of src/database/repositories/timesheet.ts -----

import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { TimesheetModel } from "../../database/models/timesheet";
import { ITimesheet } from "../../interfaces/timesheet";
import { ActivityModel } from "../../database/models/activity";

class TimeSheetRepository {
  public async getTimeSheets(
    req: Request,
    pagination: IPagination,
    search: string,
    filters: any
  ): Promise<{
    data: any;
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const query: any = { ...filters }; // Combine dynamic filters
      if (search) {
        query.file = { $regex: search, $options: "i" };
      }

      const timeSheets = await TimesheetModel.find(query)
        .populate("activity")
        .populate({
          path: "createdBy", // Populate the createdBy field
          select: "name email", // Select specific fields if needed
        })
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<any[]>(); // Convert to plain objects

      const totalCount = await TimesheetModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: timeSheets,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-getTimeSheets");
      throw error;
    }
  }

  public async getTimesheetsByUser(
    req: Request,
    userId: string,
    role: string,
    pagination: IPagination,
    search: string,
    filters: any
  ): Promise<{
    data: any;
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      // Step 1: Fetch activities associated with the user
      const activityQuery: any = {};
      if (role === "ActivityManager") {
        activityQuery.activityManager = userId; // Filter by activityManager
      } else if (role === "Worker") {
        activityQuery.worker = userId; // Filter by worker
      } else {
        throw new Error("Invalid role for filtering timesheets");
      }

      // Validate role-based query
      console.log("Activity Query: ", activityQuery);

      // Find all activities for the user
      const activities = await ActivityModel.find(activityQuery)
        .select("_id")
        .lean();
      const activityIds = activities.map((activity: any) => activity._id);

      if (activityIds.length === 0) {
        return {
          data: [],
          totalCount: 0,
          currentPage: pagination.page,
          totalPages: 0,
        };
      }

      // Step 2: Validate and apply filters
      const query: any = { ...filters };

      // Ensure activity filter is valid
      query.activity = { $in: activityIds };

      // Handle search case
      if (search) {
        query.file = { $regex: search, $options: "i" };
      }

      console.log("TimeSheet Query: ", query);

      // Fetch filtered timesheets
      const timeSheets = await TimesheetModel.find(query)
        .populate("activity")
        .populate({
          path: "createdBy",
          select: "name email",
        })
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean<any[]>();

      const totalCount = await TimesheetModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: timeSheets,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      console.error("Error in getTimesheetsByUser: ", error);
      await logError(error, req, "TimeSheetRepository-getTimesheetsByUser");
      throw error;
    }
  }

  public async getTimeSheetById(req: Request, id: string): Promise<any> {
    try {
      const timeSheet = await TimesheetModel.findById(id)
        .populate("activity activityManager worker")
        .lean<any>();
      if (!timeSheet || timeSheet.isDeleted) {
        throw new Error("TimeSheet not found");
      }
      return timeSheet;
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-getTimeSheetById");
      throw error;
    }
  }

  public async createTimeSheet(req: Request, timeSheetData: any): Promise<any> {
    try {
      const newTimeSheet = await TimesheetModel.create(timeSheetData);
      return newTimeSheet;
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-createTimeSheet");
      throw error;
    }
  }

  public async updateTimeSheet(
    req: Request,
    id: string,
    updateData: Partial<ITimesheet>
  ): Promise<ITimesheet> {
    try {
      const updatedTimeSheet = await TimesheetModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true, // Return the updated document
          runValidators: true, // Run schema validations
        }
      )
        .populate("activity")
        .lean<any>();
      if (!updatedTimeSheet || updatedTimeSheet.isDeleted) {
        throw new Error("Failed to update timeSheet");
      }
      return updatedTimeSheet;
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-updateTimeSheet");
      throw error;
    }
  }

  public async deleteTimeSheet(req: Request, id: string): Promise<any> {
    try {
      const deletedTimeSheet = await TimesheetModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      )
        .populate("activity")
        .lean<any>();
      if (!deletedTimeSheet) {
        throw new Error("Failed to delete timeSheet");
      }
      return deletedTimeSheet;
    } catch (error) {
      await logError(error, req, "TimeSheetRepository-deleteTimeSheet");
      throw error;
    }
  }
}

export default TimeSheetRepository;

# ----- End of src/database/repositories/timesheet.ts -----


# ----- Start of src/database/repositories/worker.ts -----

import { Request } from "express";
import { WorkerModel } from "../models/worker";
import { IWorker, ICreateWorker, IUpdateWorker } from "../../interfaces/worker";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class WorkerRepository {
  public async getWorkers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IWorker[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const workersDoc = await WorkerModel.find(query)
        .populate("serviceCompany", "_id name")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const workers = workersDoc.map((doc) => doc.toObject() as IWorker);

      const totalCount = await WorkerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: workers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "WorkerRepository-getWorkers");
      throw error;
    }
  }

  public async getWorkerById(req: Request, id: string): Promise<IWorker> {
    try {
      const workerDoc = await WorkerModel.findById(id).populate(
        "serviceCompany",
        "_id name"
      );

      if (!workerDoc) {
        throw new Error("Worker not found");
      }

      return workerDoc.toObject() as IWorker;
    } catch (error) {
      await logError(error, req, "WorkerRepository-getWorkerById");
      throw error;
    }
  }

  public async createWorker(
    req: Request,
    workerData: ICreateWorker
  ): Promise<IWorker> {
    try {
      const newWorker = await WorkerModel.create(workerData);
      return newWorker.toObject() as IWorker;
    } catch (error) {
      await logError(error, req, "WorkerRepository-createWorker");
      throw error;
    }
  }

  public async updateWorker(
    req: Request,
    id: string,
    workerData: Partial<IUpdateWorker>
  ): Promise<IWorker> {
    try {
      const updatedWorker = await WorkerModel.findByIdAndUpdate(
        id,
        workerData,
        { new: true }
      ).populate("serviceCompany");
      if (!updatedWorker) {
        throw new Error("Failed to update Worker");
      }
      return updatedWorker.toObject() as IWorker;
    } catch (error) {
      await logError(error, req, "WorkerRepository-updateWorker");
      throw error;
    }
  }

  public async deleteWorker(req: Request, id: string): Promise<IWorker> {
    try {
      const deletedWorker = await WorkerModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).populate("serviceCompany");
      if (!deletedWorker) {
        throw new Error("Failed to delete Worker");
      }
      return deletedWorker.toObject() as IWorker;
    } catch (error) {
      await logError(error, req, "WorkerRepository-deleteWorker");
      throw error;
    }
  }
}

export default WorkerRepository;

# ----- End of src/database/repositories/worker.ts -----


# ----- Start of src/helpers/encrypt.ts -----

import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { JWT_EXPIRE, JWT_REFRESH_EXPIRE, JWT_REFRESH_SECRET, JWT_SECRET } from "../config";

const secret_key: string = JWT_SECRET || "";
const expire_time: string = JWT_EXPIRE || "";
const refresh_secret_key: string = JWT_REFRESH_SECRET;
const refresh_expire_time: string = JWT_REFRESH_EXPIRE || "";
// Hash the password
export const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password);
};

// Verify the password
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await argon2.verify(hashedPassword, password);
};

// Create a token
export const createToken = (payload: object): string => {
  return jwt.sign(payload, secret_key, { expiresIn: expire_time });
};

// Verify a token
export const verifyToken = (
  token: string,
  name?: string
): object | string | boolean => {
  try {
    return jwt.verify(token, secret_key);
  } catch (err: any) {
    console.log(err);

    // if token is expired, return an error message
    if (err.name === "TokenExpiredError") {
      return false;
    }
    throw new Error("Invalid Token");
  }
};

// Create a refresh token
export const createRefreshToken = (payload: object): string => {
  return jwt.sign(payload, refresh_secret_key, {
    expiresIn: refresh_expire_time,
  });
};

// Verify a refresh token
export const verifyRefreshToken = (
  token: string
): object | string | boolean => {
  try {
    return jwt.verify(token, refresh_secret_key);
  } catch (err: any) {
    throw new Error("Invalid Token");
  }
};

# ----- End of src/helpers/encrypt.ts -----


# ----- Start of src/helpers/nodeMailer.ts -----

import * as nodemailer from "nodemailer";
// import { INewAdminPassword } from "../interfaces/admin";
import { GOOGLE_EMAIL, GOOGLE_PASS } from "../config";

export async function newAdminPasswordEmail(newAdmin: any) {
  const mailOptions = {
    from: GOOGLE_EMAIL,
    to: newAdmin.email,
    subject: "New Admin Account",
    html: `
        <h1>Welcome to P2Care</h1>
        <p>Hello ${newAdmin.name},</p>
        <p>Your new admin account has been created successfully.</p>
        <p>Your password is: <strong>${newAdmin.password}</strong></p>
        <p>Use this password to login to your account.</p>
        <p>Thank you for joining us.</p>
        `,
  };

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: GOOGLE_EMAIL,
      pass: GOOGLE_PASS,
    },
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Email sending failed:", error);
  }
}

export async function updateAdminPasswordEmail(updateAdmin: any) {
  const mailOptions = {
    from: GOOGLE_EMAIL,
    to: updateAdmin.email,
    subject: "Admin Account Password Update",
    html: `
        <h1>Welcome to Activity Tracking</h1>
        <p>Hello ${updateAdmin.name},</p>
        <p>Your admin account password has been updated successfully.</p>
        <p>Your new password is: <strong>${updateAdmin.password}</strong></p>
        <p>Use this password to login to your account.</p>
        <p>Thank you for joining us.</p>
        `,
  };

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: GOOGLE_EMAIL,
      pass: GOOGLE_PASS,
    },
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Email sending failed:", error);
  }
}

export async function sendOtpEmail(email: string, otp: number) {
  const mailOptions = {
    from: GOOGLE_EMAIL,
    to: email,
    subject: "OTP Verification",
    html: `
        <h1>Welcome to Activity Tracking</h1>
        <p>Hello,</p>
        <p>Your OTP for email verification is: <strong>${otp}</strong></p>
        <p>Use this OTP to verify your email.</p>
        <p>Thank you for joining us.</p>
        `,
  };

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: GOOGLE_EMAIL,
      pass: GOOGLE_PASS,
    },
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Email sending failed:", error);
  }
}

# ----- End of src/helpers/nodeMailer.ts -----


# ----- Start of src/helpers/otpGenerator.ts -----

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000); // 6 digit random number
};

# ----- End of src/helpers/otpGenerator.ts -----


# ----- Start of src/helpers/twilio.ts -----

import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SENDER_PHONE } from "../config";
import twilio from "twilio";

export async function sendOtpSMS(
  phoneNumber: string,
  otp: number
): Promise<void> {
  const accountId = TWILIO_ACCOUNT_SID;
  const authToken = TWILIO_AUTH_TOKEN;
  const client = twilio(accountId, authToken);
  console.log(client);
  // Define the sms content with template variables
  const smsOption = {
    from: SENDER_PHONE,
    to: "+91 7306096941",
    body: `Your OTP: *${otp}*. This OTP is valid for a single use and will expire in 10 minutes.`,
  };

  // Send sms using Twilio
  try {
    const response = await client.messages.create(smsOption);
    console.log("SMS sent successfully: ", response);
  } catch (error) {
    console.error("SMS sending failed: ", error);
  }
}

# ----- End of src/helpers/twilio.ts -----


# ----- Start of src/index.ts -----

import app from "./app";
import { BASE_URL, NODE_ENV, PORT } from "./config";
import connectDB from "./database/connection";
import path from "path";
import express from "express";
import { prefix } from "./routes";
const port = PORT || 5001;
async function startServer() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`${BASE_URL}/api${prefix}`);
  });
}
app.use("/uploads", express.static(path.join(__dirname, "./uploads")));
startServer();

# ----- End of src/index.ts -----


# ----- Start of src/interfaces/activity.ts -----

import mongoose from "mongoose";
import { ProjectModel } from "../database/models/project";
import { ActivityManagerModel } from "../database/models/activityManager";
import { WorkerModel } from "../database/models/worker";
import { ActivityStatusModel } from "../database/models/activityStatus";
import { CustomerModel } from "../database/models/customer";
import { ActivityTypeModel } from "../database/models/activityType";


export interface ICreateActivity {
  title: string;
  description: string;
  project: string; // Project ID
  budget: number;
  forecastDate: Date;
  actualDate: Date;
  targetDate: Date;
  workers: string[]; // Worker IDs
  updatedBy: string; // Worker or Manager ID
  updatedByModel: "Worker" | "Manager";
  hoursSpent: number;
  status: string; // ActivityStatus ID
  customer: string; // Customer ID
  // Add any additional fields if necessary
}

export interface IUpdateActivity {
  title?: string;
  description?: string;
  project?: string; // Project ID
  budget?: number;
  forecastDate?: Date;
  actualDate?: Date;
  targetDate?: Date;
  workers?: string[]; // Worker IDs
  updatedBy?: string; // Worker or Manager ID
  updatedByModel?: "Worker" | "Manager";
  hoursSpent?: number;
  status?: string; // ActivityStatus ID
  workCompleteStatus?: boolean;
  managerFullStatus?: boolean;
  customerStatus?: boolean;
  isSubmitted?: boolean;
  isAccepted?: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
  customer?: string; // Customer ID
  isPending?: boolean;
  isOnHold?: boolean;
  isDisabled?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

# ----- End of src/interfaces/activity.ts -----


# ----- Start of src/interfaces/activityFile.ts -----

import { Document } from "mongoose";
import { IFile } from "./file";

export interface IActivityFile extends Document {
  activityId: string; // Reference to the associated activity
  files: Array<{
    file: IFile; // Reference to the file
    status: "Submitted" | "Approved" | "Rejected"; // File status
    submittedBy?: string; // Optional: Identifier of the user who submitted the file
    comments?: string; // Optional: Comments or feedback on the file
  }>;
}

# ----- End of src/interfaces/activityFile.ts -----


# ----- Start of src/interfaces/activityManager.ts -----

import mongoose from "mongoose";

export interface IActivityManager {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  role: string; // Assign default role
}

export interface ICreateActivityManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
}

export interface IUpdateActivityManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  isActive?: boolean;
}

# ----- End of src/interfaces/activityManager.ts -----


# ----- Start of src/interfaces/activityStatus.ts -----

export interface IActivityStatus {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  // Add any additional fields if necessary
}

export interface ICreateActivityStatus {
  name: string;
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

export interface IUpdateActivityStatus {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

# ----- End of src/interfaces/activityStatus.ts -----


# ----- Start of src/interfaces/activityType.ts -----

export interface IActivityType {
  name: string;
}

export interface ICreateActivityType {
  name: string;
}

export interface IUpdateActivityType {
  name?: string;
}

# ----- End of src/interfaces/activityType.ts -----


# ----- Start of src/interfaces/admin.ts -----

export interface IAdmin {
  _id: string;
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  role: string;
}

export interface ICreateAdmin {
  name: string;
  email: string;
  password: string;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  // Add any additional fields if necessary
}

export interface IUpdateAdmin {
  name?: string;
  email?: string;
  password?: string;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  refreshToken?: string;
  // Add any additional fields if necessary
}

# ----- End of src/interfaces/admin.ts -----


# ----- Start of src/interfaces/customer.ts -----

export interface ICustomer {
  _id: string;
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name: string;
  password: string;
  role: string;
}

export interface ICreateCustomer {
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name: string;
  password: string;
}

export interface IUpdateCustomer {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name?: string;
  password?: string;
}

# ----- End of src/interfaces/customer.ts -----


# ----- Start of src/interfaces/error.ts -----

export interface IError {
  message: string;
  stack: string;
  resolved: boolean;
  stage: string;
  api: string;
  location: string;
  body: object;
}


# ----- End of src/interfaces/error.ts -----


# ----- Start of src/interfaces/exampleInterface.ts -----

export interface IExampleInterface {
  name: string;
  description: string;
}


# ----- End of src/interfaces/exampleInterface.ts -----


# ----- Start of src/interfaces/file.ts -----

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

# ----- End of src/interfaces/file.ts -----


# ----- Start of src/interfaces/location.ts -----

import mongoose from "mongoose";
import { ILocationType } from "./locationType";

export interface ILocation extends mongoose.Document {
  customId: string;
  name: string;
  address: string;
  city: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  managerCodes: any;
  map: string;
  nation: string;
  street?: string;
  owner: string;
  province: string;
  region: string;
  locationManagers: {
    manager: string;
    code: string;
  }[];
  locationType: mongoose.Schema.Types.ObjectId | ILocationType;
  isNearAnotherLocation: boolean;
}

# ----- End of src/interfaces/location.ts -----


# ----- Start of src/interfaces/locationManager.ts -----

import mongoose from "mongoose";
import { ILocation } from "./location";

export interface ILocationManager {
  code: string;
  name: string;
}

export interface ICreateLocationManager {
  code: string;
  name: string;
}

export interface IUpdateLocationManager {
  code?: string;
  name?: string;
}

# ----- End of src/interfaces/locationManager.ts -----


# ----- Start of src/interfaces/locationType.ts -----

import mongoose from "mongoose";

export interface ILocationType {
  name: string;
}

# ----- End of src/interfaces/locationType.ts -----


# ----- Start of src/interfaces/manager.ts -----

import mongoose from "mongoose";

export interface IManager {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  fileId?: string; // Unique identifier for the uploaded file
  fileURL?: string; // URL to access the uploaded file
  role: string; // Role of the manager
}

export interface ICreateManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
  fileId: string;
  fileURL: string;
}

export interface IUpdateManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  fileId?: string;
  fileURL?: string;
  isActive?: boolean; 
}

# ----- End of src/interfaces/manager.ts -----


# ----- Start of src/interfaces/pagination.ts -----

export interface IPagination {
  limit: number;
  page: number;
}


# ----- End of src/interfaces/pagination.ts -----


# ----- Start of src/interfaces/project.ts -----

import { ICustomer } from "./customer";
import { IAdmin } from "./admin";
import { IManager } from "./manager";
import { IProjectStatus } from "./projectStatus";
import { IProjectManager } from "./projectManager";

import mongoose from "mongoose";
import { CustomerModel } from "../database/models/customer";
import { AdminModel } from "../database/models/admin";
import { ManagerModel } from "../database/models/manager";
import { ProjectStatusModel } from "../database/models/projectStatus";
import { ProjectTypeModel } from "../database/models/projectType";
import { LocationModel } from "../database/models/location";
import { ProjectManagerModel } from "../database/models/projectManager";

export interface IProject extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  customId: string;
  prevCustomId: string;
  customer: mongoose.Schema.Types.ObjectId | typeof CustomerModel;
  projectManager: mongoose.Schema.Types.ObjectId | typeof ProjectManagerModel;
  status: mongoose.Schema.Types.ObjectId | typeof ProjectStatusModel;
  type: mongoose.Schema.Types.ObjectId | typeof ProjectTypeModel;
  location: mongoose.Schema.Types.ObjectId | typeof LocationModel;
  task: string;
  orderNumber: string;
  assignmentDate: Date;
  schedaRadioDate: Date;
  statusHistory: mongoose.Schema.Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
}

export interface ICreateProject {
  title: string;
  description: string;
  customer: string; // Customer ID
  projectManager: string; // Project ID
  // Add any additional fields if necessary
}

export interface IUpdateProject {
  title?: string;
  description?: string;
  customer?: string; // Customer ID
  projectManager?: string; // Manager ID
  status?: string; // ProjectStatus ID
  isActive?: boolean;
  isDeleted?: boolean;
  // Add any additional fields if necessary
}

# ----- End of src/interfaces/project.ts -----


# ----- Start of src/interfaces/projectManager.ts -----

import mongoose from "mongoose";

export interface IProjectManager {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  role: string; // Role of the project manager
}

export interface ICreateProjectManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
}

export interface IUpdateProjectManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  isActive?: boolean;
}

# ----- End of src/interfaces/projectManager.ts -----


# ----- Start of src/interfaces/projectStatus.ts -----

// src/interfaces/projectStatus.ts
import mongoose from "mongoose";

export interface IProjectStatus {
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

# ----- End of src/interfaces/projectStatus.ts -----


# ----- Start of src/interfaces/projectType.ts -----

export interface IProjectType {
  name: string;
}

export interface ICreateProjectType {
  name: string;
}

export interface IUpdateProjectType {
  name?: string;
}

# ----- End of src/interfaces/projectType.ts -----


# ----- Start of src/interfaces/serviceCompany.ts -----

export interface IServiceCompany {
  name: string;
  address: string;
  description?: string;
  map?: string;
  url?: string;
  isActive: boolean;
  isDeleted: boolean;
}

export interface ICreateServiceCompany {
  name: string;
  address: string;
  description?: string;
  map?: string;
  url?: string;
}

export interface IUpdateServiceCompany {
  name?: string;
  address?: string;
  description?: string;
  map?: string;
  url?: string;
}


# ----- End of src/interfaces/serviceCompany.ts -----


# ----- Start of src/interfaces/timesheet.ts -----

import mongoose from "mongoose";
import { ActivityModel } from "@database/models/activity";
import { WorkerModel } from "@database/models/worker";
import { ActivityManagerModel } from "../database/models/activityManager";

export interface IUpdateTimesheet {
  activity?: string; // Activity ID
  createdByRole: string;
  createdBy: mongoose.Schema.Types.ObjectId | typeof WorkerModel;
  note?: string;
  startTime?: Date;
  endTime?: Date;
  hoursSpent?: number;
  date?: Date;
  fileId?: string; // Identifier for the uploaded file
  fileURL?: string; // URL to access the uploaded file (optional)  isPending?: boolean;
  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  // Add any additional fields if necessary
}

export interface ITimesheet extends mongoose.Document {
  activity: mongoose.Schema.Types.ObjectId | typeof ActivityModel;
  createdBy: mongoose.Schema.Types.ObjectId;
  createdByRole: string;
  note?: string;
  startTime: Date;
  endTime: Date;
  hoursSpent: number;
  date: Date;
  file: string;
  isPending?: boolean;
  isRejected?: boolean;
  isAccepted?: boolean;
  isResubmitted?: boolean;
}

# ----- End of src/interfaces/timesheet.ts -----


# ----- Start of src/interfaces/worker.ts -----

import mongoose from "mongoose";

export interface IWorker {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  isService: boolean;
  name: string;
  password: string;
  serviceCompany: mongoose.Schema.Types.ObjectId | string;
  role: string;
}

export interface ICreateWorker {
  email: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isService?: boolean;
  name: string;
  password: string;
  serviceCompany: string;
}

export interface IUpdateWorker {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isService?: boolean;
  name?: string;
  password?: string;
  serviceCompany?: string;
}

# ----- End of src/interfaces/worker.ts -----


# ----- Start of src/middlewares/activity.ts -----

import { Request, Response, NextFunction } from "express";
import { ActivityModel } from "../database/models/activity";
import mongoose from "mongoose";

class ActivityMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    // Validate request for creating an activity
    // Add your validation logic here
    next();
  }
  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    // Check if activity ID is provided
    if (!id) {
      return res.status(400).json({ error: "Activity ID is required." });
    }

    // Check if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid activity ID format." });
    }

    try {
      // Check if the activity exists in the database
      const activity = await ActivityModel.findById(id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found." });
      }

      // Activity exists and is valid, proceed to the next middleware or route handler
      next();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
  // Middleware to validate bulk activity data
  validateBulkActivities = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const activities = req.body;

    // Ensure activities is an array
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        message: "Invalid or empty activities array",
        invalidRows: [],
      });
    }

    const invalidRows: Array<any> = [];

    activities.forEach((activity, index) => {
      const errors: string[] = [];

      // Validate required fields for each activity
      if (!activity.project) {
        errors.push("Missing project");
      }
      if (!activity.activityManager) {
        errors.push("Missing activity manager");
      }
      if (!activity.type) {
        errors.push("Missing activity type");
      }
      if (!activity.worker || activity.worker.length === 0) {
        errors.push("Missing worker(s)");
      }

      // If there are any errors, add them to the invalidRows array
      if (errors.length > 0) {
        invalidRows.push({ row: index + 1, issues: errors });
      }
    });

    // If there are any invalid rows, send a formatted response
    if (invalidRows.length > 0) {
      return res.status(400).json({
        message: "Bulk validation failed. Invalid rows found.",
        invalidRows,
      });
    }

    // If everything is valid, continue to the next handler
    next();
  };

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Activity ID is required." });
    }
    // Add additional validation if necessary
    next();
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Activity ID is required." });
    }
    next();
  }
}

export default ActivityMiddleware;

# ----- End of src/middlewares/activity.ts -----


# ----- Start of src/middlewares/activityFile.ts -----

// src/database/models/ActivityFileModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IActivityFile extends Document {
  activityId: mongoose.Types.ObjectId;
  files: {
    file: mongoose.Types.ObjectId;
    status: "Submitted" | "Approved" | "Rejected";
    submittedBy?: mongoose.Types.ObjectId;
    comments?: string;
  }[];
}

const ActivityFileSchema = new Schema<IActivityFile>(
  {
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
    files: [
      {
        file: { type: Schema.Types.ObjectId, ref: "File", required: true },
        status: {
          type: String,
          enum: ["Submitted", "Approved", "Rejected"],
          required: true,
        },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        comments: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const ActivityFileModel = mongoose.model<IActivityFile>(
  "ActivityFile",
  ActivityFileSchema
);

export default ActivityFileModel;

# ----- End of src/middlewares/activityFile.ts -----


# ----- Start of src/middlewares/activityManager.ts -----

// src/middlewares/activityManager.ts

import { Request, Response, NextFunction } from "express";

export const validateActivityManager = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add your validation logic here
  // Example: Check if required fields are provided
  const { email, name, password, admin } = req.body;
  if (!email || !name || !password || !admin) {
    return res.status(400).json({ error: "All fields are required." });
  }
  next();
};

# ----- End of src/middlewares/activityManager.ts -----


# ----- Start of src/middlewares/activityStatus.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityStatusMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name is required",
          "Name must be provided",
          400
        );
        return;
      }
      // Add more validation as needed (e.g., unique name check)
      next();
    } catch (error) {
      await logError(error, req, "ActivityStatusMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, isActive, isDeleted } = req.body;
      if (!name && isActive === undefined && isDeleted === undefined) {
        res.sendError(
          "ValidationError: At least one field must be provided for update",
          "At least one field must be provided for update",
          400
        );
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "ActivityStatusMiddleware-validateUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "ActivityStatusMiddleware-validateDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "ActivityStatusMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityStatusMiddleware;

# ----- End of src/middlewares/activityStatus.ts -----


# ----- Start of src/middlewares/activityType.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ActivityTypeMiddleware {
  public async createActivityType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityTypeCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateActivityType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided for update",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityTypeUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteActivityType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityTypeDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getActivityType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ActivityTypeGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ActivityTypeMiddleware;

# ----- End of src/middlewares/activityType.ts -----


# ----- Start of src/middlewares/admin.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class AdminMiddleware {

  public async validateLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.sendError(
          "ValidationError: Email and Password are required",
          "Email and Password are required",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateLogin");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.sendError(
          "ValidationError: Name, Email, and Password are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      // Add more validation as needed (e.g., email format, password strength)
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, isSuperAdmin, isActive, isDeleted } = req.body;
      if (!name && !email && !password && isSuperAdmin === undefined && isActive === undefined && isDeleted === undefined) {
        res.sendError(
          "ValidationError: At least one field must be provided for update",
          "At least one field must be provided for update",
          400
        );
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default AdminMiddleware;

# ----- End of src/middlewares/admin.ts -----


# ----- Start of src/middlewares/apiLogger.ts -----

import logger from "../utils/apiLogger";
import { Request, Response, NextFunction } from "express";

const apiLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logDetails = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ip: req.ip,
      responseTime: `${duration}ms`,
      userAgent: req.headers["user-agent"] || "unknown",
    };

    logger.info(JSON.stringify(logDetails));
  });

  next();
};

export default apiLogger;

# ----- End of src/middlewares/apiLogger.ts -----


# ----- Start of src/middlewares/auth.ts -----

// src/middlewares/authMiddleware.ts

import { JWT_SECRET } from "../config";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({
      success: false,
      message: "Authentication failed: No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as DecodedToken;
    req.user = decoded;
    next();
  } catch (error: any) {
    console.log("Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Authentication failed: Invalid token",
    });
  }
};

export default authenticateToken;

# ----- End of src/middlewares/auth.ts -----


# ----- Start of src/middlewares/authorizeRoles.ts -----

// src/middlewares/authorizeRoles.ts

import { Request, Response, NextFunction } from 'express';

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to perform this action',
      });
    }

    next();
  };
};

# ----- End of src/middlewares/authorizeRoles.ts -----


# ----- Start of src/middlewares/customer.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class CustomerMiddleware {
  public async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;
      if (!email || !name || !password) {
        res.sendError(
          "ValidationError: Email, Name, and Password must be provided",
          "Email, Name, and Password must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;
      if (!email && !name && !password) {
        res.sendError(
          "ValidationError: At least one field (Email, Name, or Password) must be provided",
          "At least one field (Email, Name, or Password) must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default CustomerMiddleware;

# ----- End of src/middlewares/customer.ts -----


# ----- Start of src/middlewares/error.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ErrorMiddleware {
  constructor() {}

  public async resolveError(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided", // Technical error details
          "ID must be provided", // User-friendly message
          400
        );
        return;
      }
      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ErrorResolve");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }

  public async deleteError(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided", // Technical error details
          "ID must be provided", // User-friendly message
          400
        );
        return;
      }
      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ErrorDelete");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }

  public async batchDeleteErrors(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ids = req.body;
      if (!ids) {
        res.sendError(
          "ValidationError: IDs must be provided", // Technical error details
          "IDs must be provided", // User-friendly message
          400
        );
        return;
      }
      // Check if ids is an array
      if (!Array.isArray(ids)) {
        res.sendError(
          "ValidationError: IDs must be an array", // Technical error details
          "IDs must be an array", // User-friendly message
          400
        );
        return;
      }

      // Check if ids is not empty
      if (ids.length === 0) {
        res.sendError(
          "ValidationError: IDs must not be empty", // Technical error details
          "IDs must not be empty", // User-friendly message
          400
        );
        return;
      }

      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ErrorBatchDelete");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }
}

export default ErrorMiddleware;


# ----- End of src/middlewares/error.ts -----


# ----- Start of src/middlewares/exampleMiddleware.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ExampleMiddleware {
  constructor() {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      if (!name || !description) {
        res.sendError(
          "ValidationError: Name and description are required", // Technical error details
          "Missing required fields: name and description", // User-friendly message
          400
        );
        return;
      }
      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ExampleCreate");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }
  // update
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const { id } = req.params;
      // check if id is provided
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided", // Technical error details
          "ID must be provided", // User-friendly message
          400
        );
        return;
      }
      //  either name or description must be provided
      if (!name && !description) {
        res.sendError(
          "ValidationError: Name or description must be provided", // Technical error details
          "Name or description must be provided", // User-friendly message
          400
        );
        return;
      }

      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ExampleUpdate");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }
  // delete
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided", // Technical error details
          "ID must be provided", // User-friendly message
          400
        );
        return;
      }
      next();
    } catch (error: any) {
      await logError(error, req, "Middleware-ExampleDelete");
      res.sendError(error.message, "An unexpected error occurred", 500); // Default to 500 for internal server error
    }
  }
}

export default ExampleMiddleware;


# ----- End of src/middlewares/exampleMiddleware.ts -----


# ----- Start of src/middlewares/file.ts -----

// src/middlewares/fileValidation.ts

import { Request, Response, NextFunction } from "express";

class FileValidationMiddleware {
  /**
   * Validates single file uploads.
   */
  public validateUpload(req: Request, res: Response, next: NextFunction) {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Additional validations can be added here if needed

    next();
  }

  /**
   * Validates multiple file uploads.
   */
  public validateUploadMultiple(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    // Additional validations can be added here if needed

    next();
  }
}

export default FileValidationMiddleware;

# ----- End of src/middlewares/file.ts -----


# ----- Start of src/middlewares/location.ts -----

import { LocationManagerModel } from "../database/models/locationManager";
import { LocationTypeModel } from "../database/models/locationType";
import { Request, Response, NextFunction } from "express";

class LocationMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    const { name, address, city } = req.body;
    if (!name) {
      return res
        .status(400)
        .send("Missing required fields for creating a location");
    }
    next();
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    // const { fileId, fileURL } = req.body;
    // if (fileId && !fileURL) {
    //   return res
    //     .status(400)
    //     .send(
    //       "fileURL is required if fileId is provided for updating a location"
    //     );
    // }
    next();
  }

  validateBulkCreateLocations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const locations = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty locations array" });
    }

    const invalidRows: any[] = [];

    for (const [index, location] of locations.entries()) {
      const errors: string[] = [];

      // Check for required fields and add error messages if missing or invalid
      if (!location.name) errors.push("Location name is missing.");
      if (!location.locationType) errors.push("Location type is missing.");
      if (!location.locationManager)
        errors.push("Location manager is missing.");
      if (!location.province) errors.push("Province is missing.");
      if (!location.nation) errors.push("Nation is missing.");
      if (!location.address) errors.push("Address is missing.");

      // Validate coordinates
      if (location.latitude && isNaN(parseFloat(location.latitude)))
        errors.push("Invalid latitude.");
      if (location.longitude && isNaN(parseFloat(location.longitude)))
        errors.push("Invalid longitude.");

      // Validate locationType reference
      const locationType = await LocationTypeModel.findOne({
        name: location.locationType,
      });
      if (!locationType)
        errors.push(`Invalid location type: ${location.locationType}`);

      // Validate locationManager reference
      const locationManager = await LocationManagerModel.findOne({
        name: location.locationManager,
      });
      if (!locationManager)
        errors.push(`Invalid location manager: ${location.locationManager}`);

      if (errors.length > 0) {
        invalidRows.push({ row: index + 1, issues: errors });
      }
    }

    // If there are invalid rows, return an error response
    if (invalidRows.length > 0) {
      return res.status(400).json({
        message: "Bulk validation failed. Invalid rows found.",
        invalidRows, // Send details about the rows that have errors
      });
    }

    next(); // Proceed to the next middleware if no validation errors
  };
}

export default LocationMiddleware;

# ----- End of src/middlewares/location.ts -----


# ----- Start of src/middlewares/locationManager.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationManagerMiddleware {
  public async createLocationManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Code and Name must be provided",
          "Code and Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationManagerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateLocationManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { code, name } = req.body;
      if (!code && !name && !req.body.managingLocations) {
        res.sendError(
          "ValidationError: At least one field (Code, Name, or ManagingLocations) must be provided",
          "At least one field must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationManagerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteLocationManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationManagerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getLocationManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationManagerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationManagerMiddleware;

# ----- End of src/middlewares/locationManager.ts -----


# ----- Start of src/middlewares/locationType.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationTypeMiddleware {
  public async validateLocationTypeData(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError("Name must be provided", "Validation Error", 400);
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "LocationTypeMiddleware-validateLocationTypeData");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationTypeMiddleware;


# ----- End of src/middlewares/locationType.ts -----


# ----- Start of src/middlewares/manager.ts -----

// src/middlewares/manager.ts

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ManagerMiddleware {
  public async createManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin, fileId, fileURL } = req.body;
      if (!email || !name || !password || !admin || !fileId || !fileURL) {
        res.sendError(
          "error",
          "Email, Name, Password, Admin,  fileId, and fileURL must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin,  fileId, fileURL } = req.body;
      if (
        !email &&
        !name &&
        !password &&
        !admin &&
        !fileId &&
        !fileURL
      ) {
        res.sendError(
          "error",
          "At least one field (Email, Name, Password, Admin, Role, fileId, or fileURL) must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(id, "ID must be provided", 400);
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(id, "ID must be provided", 400);
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ManagerMiddleware;

# ----- End of src/middlewares/manager.ts -----


# ----- Start of src/middlewares/project.ts -----

import { Request, Response, NextFunction } from "express";
import Joi from "joi";

class ProjectMiddleware {
  public validateCreate(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      description: Joi.string().optional(),
      customer: Joi.string().required(),
      location: Joi.string().required(),
      projectManager: Joi.string().required(),
      type: Joi.string().required(),
      task: Joi.string().optional(),
      orderNumber: Joi.string().optional(),
      assignmentDate: Joi.date().required(),
      schedaRadioDate: Joi.date().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }
  public async validateBulkCreate(req: Request, res: Response, next: Function) {
    const projects = req.body;

    if (!Array.isArray(projects) || projects.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty projects array" });
    }

    const invalidRows: any[] = [];

    projects.forEach((project: any, index: number) => {
      const errors: string[] = [];

      // Check for required fields and add error messages if missing or invalid
      if (!project.location) errors.push("Location is missing.");
      if (!project.customer) errors.push("Customer is missing.");
      if (!project.projectManager) errors.push("Project manager is missing.");
      if (!project.type) errors.push("Project type is missing.");

      // Validate dates
      if (
        !project.assignmentDate ||
        isNaN(new Date(project.assignmentDate).getTime())
      ) {
        errors.push(
          "Invalid or missing assignment date. Expected format: YYYY-MM-DD."
        );
      }
      if (
        !project.schedaRadioDate ||
        isNaN(new Date(project.schedaRadioDate).getTime())
      ) {
        errors.push(
          "Invalid or missing scheda radio date. Expected format: YYYY-MM-DD."
        );
      }

      // Validate other fields (task, orderNumber, etc.)
      if (!project.task) errors.push("Task is missing.");
      if (!project.orderNumber) errors.push("Order number is missing.");

      // If there are errors for the current row, add them to the invalidRows array
      if (errors.length > 0) {
        invalidRows.push({ row: index + 1, issues: errors });
      }
    });

    if (invalidRows.length > 0) {
      return res.status(400).json({
        message: "Bulk validation failed. Invalid rows found.",
        invalidRows, // Send details about the rows that have errors
      });
    }

    next(); // Proceed to the next middleware if no validation errors
  }

  public validateGet(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }

  public validateUpdate(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      _id: Joi.string().optional(),
      title: Joi.string().optional(),
      description: Joi.string().optional(),
      customId: Joi.string().optional(),
      prevCustomId: Joi.string().optional(),
      customer: Joi.string().optional(),
      admin: Joi.string().optional(),
      location: Joi.string().optional(),
      projectManager: Joi.string().optional(),
      status: Joi.string().optional(),
      type: Joi.string().optional(),
      task: Joi.string().optional(),
      orderNumber: Joi.string().optional(),
      assignmentDate: Joi.date().optional(),
      schedaRadioDate: Joi.date().optional(),
      statusHistory: Joi.array().items(Joi.string()).optional(),
      isActive: Joi.boolean().optional(),
      isDeleted: Joi.boolean().optional(),
      updatedAt: Joi.date().optional(),
      createdAt: Joi.date().optional(),
      __v: Joi.date().optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }

  public validateDelete(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  }
}

export default ProjectMiddleware;

# ----- End of src/middlewares/project.ts -----


# ----- Start of src/middlewares/projectManager.ts -----

// src/middlewares/projectManager.ts

import { Request, Response, NextFunction } from "express";

export const validateProjectManager = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add your validation logic here
  const { email, name, password, admin } = req.body;
  if (!email || !name || !password || !admin) {
    return res.status(400).json({ error: "All fields are required." });
  }
  next();
};

# ----- End of src/middlewares/projectManager.ts -----


# ----- Start of src/middlewares/projectStatus.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectStatusMiddleware {
  public async createProjectStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectStatusCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateProjectStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectStatusUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteProjectStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectStatusDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getProjectStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectStatusGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectStatusMiddleware;

# ----- End of src/middlewares/projectStatus.ts -----


# ----- Start of src/middlewares/projectType.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProjectTypeMiddleware {
  public async createProjectType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectTypeCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateProjectType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided for update",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectTypeUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteProjectType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectTypeDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getProjectType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ProjectTypeGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ProjectTypeMiddleware;

# ----- End of src/middlewares/projectType.ts -----


# ----- Start of src/middlewares/rateLimiter.ts -----

// src/middlewares/rateLimiter.ts

import rateLimit from "express-rate-limit";

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 upload requests per windowMs
  message:
    "Too many upload requests from this IP, please try again after 15 minutes.",
  headers: true,
});

export default uploadLimiter;

# ----- End of src/middlewares/rateLimiter.ts -----


# ----- Start of src/middlewares/roleMiddleware.ts -----

// src/middlewares/roleMiddleware.ts

import { Request, Response, NextFunction } from "express";

const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Authorization failed: No user information",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Authorization failed: Insufficient permissions",
      });
    }

    next();
  };
};

export default authorizeRoles;

# ----- End of src/middlewares/roleMiddleware.ts -----


# ----- Start of src/middlewares/serviceCompany.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ServiceCompanyMiddleware {
  public async createServiceCompany(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(req);

      const { name, address } = req.body;
      if (!name || !address) {
        res.sendError(
          "ValidationError: Name and Address must be provided",
          "Name and Address must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ServiceCompanyCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateServiceCompany(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name, address } = req.body;
      if (!name && !address) {
        res.sendError(
          "ValidationError: At least one field (Name or Address) must be provided",
          "At least one field (Name or Address) must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ServiceCompanyUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteServiceCompany(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ServiceCompanyDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ServiceCompanyMiddleware;

# ----- End of src/middlewares/serviceCompany.ts -----


# ----- Start of src/middlewares/timesheet.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class TimesheetMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("HI");
      const { activity, startTime, endTime, date } = req.body;
      const createdBy = req.user?.id; // ID of the logged-in user
      const createdByRole = req.user?.role; // Role of the logged-in user
      console.log("HI YO YO");

      if (!activity || !startTime || !endTime || !date) {
        res.sendError(
          "ValidationError: Activity, StartTime, EndTime,  Date are required",
          "All required fields must be provided",
          400
        );
        return;
      }
      console.log("HI createdBy");

      next();
    } catch (error) {
      await logError(error, req, "TimesheetMiddleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        activity,
        worker,
        manager,
        startTime,
        endTime,
        hoursSpent,
        date,
        file,
        isPending,
        isRejected,
        isAccepted,
        isResubmitted,
        rejectionReason,
        isDeleted,
        isActive,
      } = req.body;
      if (
        !activity &&
        !worker &&
        !manager &&
        !startTime &&
        !endTime &&
        !hoursSpent &&
        !date &&
        !file &&
        isPending === undefined &&
        isRejected === undefined &&
        isAccepted === undefined &&
        isResubmitted === undefined &&
        !rejectionReason &&
        isDeleted === undefined &&
        isActive === undefined
      ) {
        res.sendError(
          "ValidationError: At least one field must be provided for update",
          "At least one field must be provided for update",
          400
        );
        return;
      }
      // Additional validation can be added here
      next();
    } catch (error) {
      await logError(error, req, "TimesheetMiddleware-validateUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "TimesheetMiddleware-validateDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "TimesheetMiddleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default TimesheetMiddleware;

# ----- End of src/middlewares/timesheet.ts -----


# ----- Start of src/middlewares/upload.ts -----

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

# ----- End of src/middlewares/upload.ts -----


# ----- Start of src/middlewares/worker.ts -----

import { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/errorLogger';

class WorkerMiddleware {
  public async createWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, serviceCompany } = req.body;
      if (!email || !name || !password || !serviceCompany) {
        res.sendError(
          'ValidationError: Email, Name, Password, and ServiceCompany must be provided',
          'Email, Name, Password, and ServiceCompany must be provided',
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, 'Middleware-WorkerCreate');
      res.sendError(error, 'An unexpected error occurred', 500);
    }
  }

  public async updateWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, serviceCompany } = req.body;
      if (!email && !name && !password && !serviceCompany) {
        res.sendError(
          'ValidationError: At least one field (Email, Name, Password, or ServiceCompany) must be provided',
          'At least one field (Email, Name, Password, or ServiceCompany) must be provided',
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, 'Middleware-WorkerUpdate');
      res.sendError(error, 'An unexpected error occurred', 500);
    }
  }

  public async deleteWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          'ValidationError: ID must be provided',
          'ID must be provided',
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, 'Middleware-WorkerDelete');
      res.sendError(error, 'An unexpected error occurred', 500);
    }
  }

  public async getWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          'ValidationError: ID must be provided',
          'ID must be provided',
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, 'Middleware-WorkerGet');
      res.sendError(error, 'An unexpected error occurred', 500);
    }
  }
}

export default WorkerMiddleware;


# ----- End of src/middlewares/worker.ts -----


# ----- Start of src/routes/activityFileRoute.ts -----

import express from "express";
import multer from "multer";
import {
  uploadFiles,
  getFiles,
  updateFile,
  deleteFile,
} from "../controllers/activityFileController";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post(
  "/upload",
  // authenticateToken,

  upload.array("files"),
  uploadFiles
);
router.get("/:activityId", getFiles);
router.patch("/:activityId/file/:fileId", updateFile);
router.delete("/:activityId/file/:fileId", deleteFile);

export default router;

# ----- End of src/routes/activityFileRoute.ts -----


# ----- Start of src/routes/activityManagerRoute.ts -----

// src/routes/activityManager.ts

import { Router } from "express";
import ActivityManagerService from "../services/activityManager";
import { validateActivityManager } from "../middlewares/activityManager";
import { validateUniqueEmail } from "../database/models/emailChecker";

const router = Router();
const activityManagerService = new ActivityManagerService();

router.get(
  "/",
  activityManagerService.getActivityManagers.bind(activityManagerService)
);
router.get(
  "/:id",
  activityManagerService.getActivityManagerById.bind(activityManagerService)
);
router.post(
  "/",
  validateUniqueEmail,
  validateActivityManager,
  activityManagerService.createActivityManager.bind(activityManagerService)
);
router.patch(
  "/:id",
  activityManagerService.updateActivityManager.bind(activityManagerService)
);
router.delete(
  "/:id",
  activityManagerService.deleteActivityManager.bind(activityManagerService)
);

export default router;

# ----- End of src/routes/activityManagerRoute.ts -----


# ----- Start of src/routes/activityRoute.ts -----

import { Router } from "express";
import ActivityService from "../services/activity";
import ActivityMiddleware from "../middlewares/activity";
import authenticateToken from "../middlewares/auth";

const router = Router();
const activityService = new ActivityService();
const activityMiddleware = new ActivityMiddleware();

router.get(
  "/count-by-status",
  activityService.getActivityCountByStatus.bind(activityService)
);

// GET all activities
router.get(
  "/",
  authenticateToken,
  activityService.getActivities.bind(activityService)
);

// GET activity by ID
router.get(
  "/:id",
  authenticateToken,
  activityMiddleware.validateGet.bind(activityMiddleware),
  activityService.getActivity.bind(activityService)
);

// CREATE a new activity
router.post(
  "/",
  authenticateToken,
  activityMiddleware.validateCreate.bind(activityMiddleware),
  activityService.createActivity.bind(activityService)
);

// UPDATE an activity
router.patch(
  "/:id",
  authenticateToken,
  activityMiddleware.validateUpdate.bind(activityMiddleware),
  activityService.updateActivity.bind(activityService)
);

// DELETE an activity
router.delete(
  "/:id",
  authenticateToken,
  activityMiddleware.validateDelete.bind(activityMiddleware),
  activityService.deleteActivity.bind(activityService)
);

// Bulk upload activities
router.post(
  "/bulk",
  authenticateToken,
  activityMiddleware.validateBulkActivities.bind(activityMiddleware),

  activityService.bulkCreateActivities.bind(activityService)
);

export default router;

# ----- End of src/routes/activityRoute.ts -----


# ----- Start of src/routes/activityStatusRoute.ts -----

import { Router } from "express";
import ActivityStatusService from "../services/activityStatus";
import ActivityStatusMiddleware from "../middlewares/activityStatus";

const router = Router();
const activityStatusService = new ActivityStatusService();
const activityStatusMiddleware = new ActivityStatusMiddleware();

// GET all activity statuses
router.get(
  "/",
  activityStatusService.getActivityStatuses.bind(activityStatusService)
);

// GET activity status by ID
router.get(
  "/:id",
  activityStatusMiddleware.validateGet.bind(activityStatusMiddleware),
  activityStatusService.getActivityStatus.bind(activityStatusService)
);

// CREATE a new activity status
router.post(
  "/",
  activityStatusMiddleware.validateCreate.bind(activityStatusMiddleware),
  activityStatusService.createActivityStatus.bind(activityStatusService)
);

// UPDATE an activity status
router.patch(
  "/:id",
  activityStatusMiddleware.validateUpdate.bind(activityStatusMiddleware),
  activityStatusService.updateActivityStatus.bind(activityStatusService)
);

// DELETE an activity status
router.delete(
  "/:id",
  activityStatusMiddleware.validateDelete.bind(activityStatusMiddleware),
  activityStatusService.deleteActivityStatus.bind(activityStatusService)
);

export default router;

# ----- End of src/routes/activityStatusRoute.ts -----


# ----- Start of src/routes/activityTypeRoute.ts -----

import { Router } from "express";
import ActivityTypeService from "../services/activityType";
import ActivityTypeMiddleware from "../middlewares/activityType";

const activityTypeRoute = Router();
const activityTypeService = new ActivityTypeService();
const activityTypeMiddleware = new ActivityTypeMiddleware();

activityTypeRoute.get("/", activityTypeService.getActivityTypes.bind(activityTypeService));
activityTypeRoute.get(
  "/:id",
  activityTypeMiddleware.getActivityType.bind(activityTypeMiddleware),
  activityTypeService.getActivityType.bind(activityTypeService)
);
activityTypeRoute.post(
  "/",
  activityTypeMiddleware.createActivityType.bind(activityTypeMiddleware),
  activityTypeService.createActivityType.bind(activityTypeService)
);
activityTypeRoute.patch(
  "/:id",
  activityTypeMiddleware.updateActivityType.bind(activityTypeMiddleware),
  activityTypeService.updateActivityType.bind(activityTypeService)
);
activityTypeRoute.delete(
  "/:id",
  activityTypeMiddleware.deleteActivityType.bind(activityTypeMiddleware),
  activityTypeService.deleteActivityType.bind(activityTypeService)
);

export default activityTypeRoute;

# ----- End of src/routes/activityTypeRoute.ts -----


# ----- Start of src/routes/adminRoute.ts -----

import { Router } from "express";
import AdminService from "../services/admin";
import AdminMiddleware from "../middlewares/admin";
import authorizeRoles from "../middlewares/roleMiddleware";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";

const router = Router();
const adminService = new AdminService();
const adminMiddleware = new AdminMiddleware();

// // LOGIN an admin (Public route)
// router.post(
//   "/login",
//   // authorizeRoles("Admin"),
//   adminMiddleware.validateLogin.bind(adminMiddleware),
//   adminService.login.bind(adminService)
// );

router.get(
  "/user",
  authenticateToken,
  authorizeRoles("Admin"),
  adminService.getCurrentUser.bind(adminService)
);

// GET all admins
router.get(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  adminService.getAdmins.bind(adminService)
);

// GET admin by ID
router.get(
  "/:id",
  authenticateToken,
  adminMiddleware.validateGet.bind(adminMiddleware),
  adminService.getAdmin.bind(adminService)
);

// CREATE a new admin
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  validateUniqueEmail,
  adminMiddleware.validateCreate.bind(adminMiddleware),
  adminService.createAdmin.bind(adminService)
);

// UPDATE an admin
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  adminMiddleware.validateUpdate.bind(adminMiddleware),
  adminService.updateAdmin.bind(adminService)
);

// DELETE an admin
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  adminMiddleware.validateDelete.bind(adminMiddleware),
  adminService.deleteAdmin.bind(adminService)
);

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export default router;

# ----- End of src/routes/adminRoute.ts -----


# ----- Start of src/routes/authRoute.ts -----

// src/routes/authRoute.ts

import { Router } from "express";
import { authenticateUser } from "../services/authService";

const authRoute = Router();

authRoute.post("/", authenticateUser);

export default authRoute;

# ----- End of src/routes/authRoute.ts -----


# ----- Start of src/routes/customerRoute.ts -----

import { Router } from "express";
import CustomerService from "../services/customer";
import CustomerMiddleware from "../middlewares/customer";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";

const customerRoute = Router();
const customerService = new CustomerService();
const customerMiddleware = new CustomerMiddleware();

customerRoute.get(
  "/",
  authenticateToken,
  customerService.getCustomers.bind(customerService)
);
customerRoute.get(
  "/:id",
  authenticateToken,
  customerMiddleware.getCustomer.bind(customerMiddleware),
  customerService.getCustomer.bind(customerService)
);
customerRoute.post(
  "/",
  validateUniqueEmail,
  authenticateToken,
  customerMiddleware.createCustomer.bind(customerMiddleware),
  customerService.createCustomer.bind(customerService)
);
customerRoute.patch(
  "/:id",
  authenticateToken,
  customerMiddleware.updateCustomer.bind(customerMiddleware),
  customerService.updateCustomer.bind(customerService)
);
customerRoute.delete(
  "/:id",
  authenticateToken,
  customerMiddleware.deleteCustomer.bind(customerMiddleware),
  customerService.deleteCustomer.bind(customerService)
);

export default customerRoute;

# ----- End of src/routes/customerRoute.ts -----


# ----- Start of src/routes/error.ts -----

import { Router } from "express";
import ErrorService from "../services/error";
import ErrorMiddleware from "../middlewares/error";

const router = Router();
const errorService = new ErrorService();
const errorMiddleware = new ErrorMiddleware();

router.get(
  "/",
  errorService.getErrors.bind(errorService)
);

router.patch(
  "/:id/resolve",
  errorMiddleware.resolveError.bind(errorMiddleware),
  errorService.resolveError.bind(errorService)
);

router.delete(
  "/:id",
  errorMiddleware.deleteError.bind(errorMiddleware),
  errorService.deleteError.bind(errorService)
);

router.post(
  "/batch-delete",
  errorMiddleware.batchDeleteErrors.bind(errorMiddleware),
  errorService.batchDeleteErrors.bind(errorService)
);

export default router;


# ----- End of src/routes/error.ts -----


# ----- Start of src/routes/fileRoute.ts -----

// src/routes/fileRoutes.ts
import { Router } from "express";
import authenticate from "../middlewares/auth";
import fileController from "../controllers/fileController";
import upload from "../middlewares/upload";

const router = Router();

// Create a file entry (for cases where metadata needs to be created directly)
router.post("/files", authenticate, fileController.createFile);

// Fetch a specific file by ID
router.get("/files/:id", authenticate, fileController.getFileById);

// Fetch all files
router.get("/files", authenticate, fileController.getAllFiles);

// Update a specific file's metadata
router.put("/files/:id", authenticate, fileController.updateFile);

// Delete a file
router.delete("/files/:id", authenticate, fileController.deleteFile);
// Bulk upload files
router.post(
  "/files/bulk-upload",
  authenticate,
  upload.array("files"), // Multer middleware for handling multiple file uploads
  fileController.uploadBulkFiles
);

// Bulk delete files
router.delete(
  "/files/bulk-delete",
  authenticate,
  fileController.deleteBulkFiles
);

export default router;

# ----- End of src/routes/fileRoute.ts -----


# ----- Start of src/routes/index.ts -----

import { Router } from "express";

// Import Manager routes
import managerRoute from "./manager";
import customerRoute from "./customerRoute";
import workerRoute from "./workerRoute";
import adminRoute from "./adminRoute";

import timeSheetRoute from "./timesheetRoute";

import activityStatusRoute from "./activityStatusRoute";
import activityTypeRoute from "./activityTypeRoute";
import activityFileRoute from "./activityFileRoute";
import activityRoute from "./activityRoute";
import projectTypeRoute from "./projectTypeRoute";
import projectRoute from "./projectRoute";
import projectStatusRoute from "./projectStatusRoute";
import locationTypeRoute from "./locationTypeRoute";
import locationRoute from "./locationRoute";
import locationManagerRoute from "./locationManagerRoute";
import authRoute from "./authRoute";
import serviceCompanyRoute from "./serviceCompanyRoute";
import verifyTokenRoute from "./verifyTokenRoute";
import activityManagerRoute from "./activityManagerRoute";
import projectManagerRoute from "./projectManagerRoute";

// Initialize the main router
const router = Router();
const version = "v1";
const webRoute = "web";
export const prefix = `/${version}/${webRoute}`;

//Auth
router.use(`${prefix}/login`, authRoute);
router.use(`${prefix}/verify-token`, verifyTokenRoute);

// Users
router.use(`${prefix}/admin`, adminRoute);
router.use(`${prefix}/customer`, customerRoute);
router.use(`${prefix}/worker`, workerRoute);

router.use(`${prefix}/timeSheet`, timeSheetRoute);

router.use(`${prefix}/projects`, projectRoute);
router.use(`${prefix}/projectType`, projectTypeRoute);
router.use(`${prefix}/projectStatus`, projectStatusRoute);
router.use(`${prefix}/projectManager`, projectManagerRoute);

router.use(`${prefix}/activity`, activityRoute);
router.use(`${prefix}/activityFile`, activityFileRoute);
router.use(`${prefix}/activityStatus`, activityStatusRoute);
router.use(`${prefix}/activityType`, activityTypeRoute);
router.use(`${prefix}/activityManager`, activityManagerRoute);

router.use(`${prefix}/serviceCompany`, serviceCompanyRoute);

router.use(`${prefix}/locationType`, locationTypeRoute);
router.use(`${prefix}/locationManager`, locationManagerRoute);
router.use(`${prefix}/location`, locationRoute);

//file
// router.use(`${prefix}/upload`, fileRoute);

// Export the main router
export default router;

# ----- End of src/routes/index.ts -----


# ----- Start of src/routes/location.ts -----

import express from "express";
import LocationService from "../services/location";
import authenticateToken from "../middlewares/auth";
// import { AuthMiddleware } from "../middlewares/auth";

const router = express.Router();
const locationService = new LocationService();
// const authMiddleware = new AuthMiddleware();

router.get(
  "/locations",
  authenticateToken,
  locationService.getLocations.bind(locationService)
);
router.get(
  "/locations/:id",
  authenticateToken,
  locationService.getLocation.bind(locationService)
);
router.post(
  "/locations",
  authenticateToken,
  locationService.createLocation.bind(locationService)
);
router.put(
  "/locations/:id",
  authenticateToken,
  locationService.updateLocation.bind(locationService)
);
router.delete(
  "/locations/:id",
  authenticateToken,
  locationService.deleteLocation.bind(locationService)
);

export default router;

# ----- End of src/routes/location.ts -----


# ----- Start of src/routes/locationManagerRoute.ts -----

import { Router } from "express";
import LocationManagerService from "../services/locationManager";
import LocationManagerMiddleware from "../middlewares/locationManager";
import authenticateToken from "../middlewares/auth";

const locationManagerRoute = Router();
const locationManagerService = new LocationManagerService();
const locationManagerMiddleware = new LocationManagerMiddleware();

locationManagerRoute.get(
  "/",
  authenticateToken,
  locationManagerService.getLocationManagers.bind(locationManagerService)
);
locationManagerRoute.get(
  "/:id",
  authenticateToken,
  locationManagerMiddleware.getLocationManager.bind(locationManagerMiddleware),
  locationManagerService.getLocationManager.bind(locationManagerService)
);
locationManagerRoute.post(
  "/",
  authenticateToken,
  locationManagerMiddleware.createLocationManager.bind(
    locationManagerMiddleware
  ),
  locationManagerService.createLocationManager.bind(locationManagerService)
);
locationManagerRoute.patch(
  "/:id",
  authenticateToken,
  locationManagerMiddleware.updateLocationManager.bind(
    locationManagerMiddleware
  ),
  locationManagerService.updateLocationManager.bind(locationManagerService)
);
locationManagerRoute.delete(
  "/:id",
  authenticateToken,
  locationManagerMiddleware.deleteLocationManager.bind(
    locationManagerMiddleware
  ),
  locationManagerService.deleteLocationManager.bind(locationManagerService)
);

export default locationManagerRoute;

# ----- End of src/routes/locationManagerRoute.ts -----


# ----- Start of src/routes/locationRoute.ts -----

import { Router } from "express";
import LocationService from "../services/location";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import LocationMiddleware from "../middlewares/location";
import authenticateToken from "../middlewares/auth";

const locationRoute = Router();
const locationService = new LocationService();
const locationMiddleware = new LocationMiddleware();

locationRoute.get(
  "/",
  authenticateToken,
  locationService.getLocations.bind(locationService)
);
locationRoute.get(
  "/:id",
  authenticateToken,
  // locationMiddleware.getLocation.bind(locationMiddleware),
  locationService.getLocation.bind(locationService)
);
locationRoute.post(
  "/",
  // upload.single("image"),
  authenticateToken,
  // locationMiddleware.validateCreate.bind(locationMiddleware),
  locationService.createLocation.bind(locationService)
);
locationRoute.patch(
  "/:id",
  // upload.single("image"),
  authenticateToken,
  locationMiddleware.validateUpdate.bind(locationMiddleware),
  locationService.updateLocation.bind(locationService)
);
locationRoute.delete(
  "/:id",
  authenticateToken,
  // locationMiddleware.deleteLocation.bind(locationMiddleware),
  locationService.deleteLocation.bind(locationService)
);
locationRoute.post(
  "/bulk",
  authenticateToken,
  locationMiddleware.validateBulkCreateLocations.bind(locationMiddleware),
  locationService.bulkCreateLocations.bind(locationService)
);

export default locationRoute;

# ----- End of src/routes/locationRoute.ts -----


# ----- Start of src/routes/locationTypeRoute.ts -----

import { Router } from "express";
import LocationTypeService from "../services/locationType";
import LocationTypeMiddleware from "../middlewares/locationType";

const locationTypeRoute = Router();
const locationTypeService = new LocationTypeService();
const locationTypeMiddleware = new LocationTypeMiddleware();

// GET /api/location-types - Retrieve all location types
locationTypeRoute.get(
  "/",
  locationTypeService.getLocationTypes.bind(locationTypeService)
);

// GET /api/location-types/:id - Retrieve a specific location type
locationTypeRoute.get("/:id", locationTypeService.getLocationType.bind(locationTypeService));

// // POST /api/location-types - Create a new location type
locationTypeRoute.post(
  "/",
  locationTypeMiddleware.validateLocationTypeData.bind(locationTypeMiddleware),
  locationTypeService.createLocationType.bind(locationTypeService)
);

// // PATCH /api/location-types/:id - Update an existing location type
locationTypeRoute.patch(
  "/:id",
  locationTypeMiddleware.validateLocationTypeData.bind(locationTypeMiddleware),
  locationTypeService.updateLocationType.bind(locationTypeService)
);

// // DELETE /api/location-types/:id - Delete a location type
locationTypeRoute.delete("/:id", locationTypeService.deleteLocationType.bind(locationTypeService));

export default locationTypeRoute;

# ----- End of src/routes/locationTypeRoute.ts -----


# ----- Start of src/routes/manager.ts -----

/* This code snippet is setting up a router for handling manager-related routes in an Express
application. Here's a breakdown of what each part of the code is doing: */
import { Router } from "express";
import ManagerService from "../services/manager";
import ManagerMiddleware from "../middlewares/manager";

const managerRoute = Router();
const managerService = new ManagerService();
const managerMiddleware = new ManagerMiddleware();

// GET /api/managers - Retrieve all managers
managerRoute.get("/", managerService.getManagers.bind(managerService));

// GET /api/managers/:id - Retrieve a specific manager
managerRoute.get(
  "/:id",
  managerMiddleware.getManager.bind(managerMiddleware),
  managerService.getManager.bind(managerService)
);

// POST /api/managers - Create a new manager
managerRoute.post(
  "/",
  // managerMiddleware.uploadFile, // Assuming uploadFile is defined if needed
  managerMiddleware.createManager.bind(managerMiddleware),
  managerService.createManager.bind(managerService)
);

// PATCH /api/managers/:id - Update an existing manager
managerRoute.patch(
  "/:id",
  // managerMiddleware.uploadFile, // Assuming uploadFile is defined if needed
  managerMiddleware.updateManager.bind(managerMiddleware),
  managerService.updateManager.bind(managerService)
);

// DELETE /api/managers/:id - Delete a manager
managerRoute.delete(
  "/:id",
  managerMiddleware.deleteManager.bind(managerMiddleware),
  managerService.deleteManager.bind(managerService)
);

export default managerRoute;

# ----- End of src/routes/manager.ts -----


# ----- Start of src/routes/managerRoute.ts -----

import { Router } from "express";
import ManagerService from "../services/manager";
import ManagerMiddleware from "../middlewares/manager";
import authenticateToken from "../middlewares/auth";

const managerRoute = Router();
const managerService = new ManagerService();
const managerMiddleware = new ManagerMiddleware();

managerRoute.get(
  "/",
  authenticateToken,
  managerService.getManagers.bind(managerService)
);
managerRoute.get(
  "/:id",
  authenticateToken,
  managerMiddleware.getManager.bind(managerMiddleware),
  managerService.getManager.bind(managerService)
);
managerRoute.post(
  "/",
  authenticateToken,
  // managerMiddleware.uploadProfilePicture, // Handle file upload
  managerMiddleware.createManager.bind(managerMiddleware),
  managerService.createManager.bind(managerService)
);
managerRoute.patch(
  "/:id",
  authenticateToken,
  // managerMiddleware.uploadProfilePicture, // Handle file upload
  managerMiddleware.updateManager.bind(managerMiddleware),
  managerService.updateManager.bind(managerService)
);
managerRoute.delete(
  "/:id",
  authenticateToken,
  managerMiddleware.deleteManager.bind(managerMiddleware),
  managerService.deleteManager.bind(managerService)
);

export default managerRoute;

# ----- End of src/routes/managerRoute.ts -----


# ----- Start of src/routes/projectManagerRoute.ts -----

// src/routes/projectManager.ts

import { Router } from "express";
import { validateProjectManager } from "../middlewares/projectManager";
import ProjectManagerService from "../services/ProjectManager";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";

const router = Router();
const projectManagerService = new ProjectManagerService();

router.get(
  "/",
  authenticateToken,
  projectManagerService.getProjectManagers.bind(projectManagerService)
);
router.get(
  "/:id",
  authenticateToken,
  projectManagerService.getProjectManagerById.bind(projectManagerService)
);
router.post(
  "/",
  validateUniqueEmail,
  authenticateToken,
  validateProjectManager,
  projectManagerService.createProjectManager.bind(projectManagerService)
);
router.patch(
  "/:id",
  // validateProjectManager,
  projectManagerService.updateProjectManager.bind(projectManagerService)
);
router.delete(
  "/:id",
  authenticateToken,
  projectManagerService.deleteProjectManager.bind(projectManagerService)
);

export default router;

# ----- End of src/routes/projectManagerRoute.ts -----


# ----- Start of src/routes/projectRoute.ts -----

import { Router } from "express";
import ProjectService from "../services/project";
import ProjectMiddleware from "../middlewares/project";
import authenticateToken from "../middlewares/auth";

const router = Router();
const projectService = new ProjectService();
const projectMiddleware = new ProjectMiddleware();

// GET all projects
router.get(
  "/",
  authenticateToken,
  projectService.getProjects.bind(projectService)
);

// GET project by ID
router.get(
  "/:id",
  authenticateToken,
  projectMiddleware.validateGet.bind(projectMiddleware),
  projectService.getProject.bind(projectService)
);

// CREATE a new project
router.post(
  "/",
  authenticateToken,
  projectMiddleware.validateCreate.bind(projectMiddleware),
  projectService.createProject.bind(projectService)
);

// UPDATE a project
router.patch(
  "/:id",
  authenticateToken,
  projectMiddleware.validateUpdate.bind(projectMiddleware),
  projectService.updateProject.bind(projectService)
);

// DELETE a project
router.delete(
  "/:id",
  authenticateToken,
  projectMiddleware.validateDelete.bind(projectMiddleware),
  projectService.deleteProject.bind(projectService)
);

// Bulk create projects
router.post(
  "/bulk",
  authenticateToken,
  projectMiddleware.validateBulkCreate.bind(projectMiddleware),
  projectService.bulkCreateProjects.bind(projectService)
);

// Count projects by status
router.post(
  "/count-by-status",
  authenticateToken,
  projectService.getProjectCountByStatus.bind(projectService)
);

export default router;

# ----- End of src/routes/projectRoute.ts -----


# ----- Start of src/routes/projectStatusRoute.ts -----

import { Router } from "express";
import ProjectStatusService from "../services/projectStatus";
import ProjectStatusMiddleware from "../middlewares/projectStatus";
import authenticateToken from "../middlewares/auth";

const router = Router();
const projectStatusService = new ProjectStatusService();
const projectStatusMiddleware = new ProjectStatusMiddleware();

router.get(
  "/",
  authenticateToken,
  projectStatusService.getProjectStatuses.bind(projectStatusService)
);
router.get(
  "/:id",
  authenticateToken,

  projectStatusMiddleware.getProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.getProjectStatus.bind(projectStatusService)
);
router.post(
  "/",
  authenticateToken,
  projectStatusMiddleware.createProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.createProjectStatus.bind(projectStatusService)
);
router.patch(
  "/:id",
  authenticateToken,
  projectStatusMiddleware.updateProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.updateProjectStatus.bind(projectStatusService)
);
router.delete(
  "/:id",
  authenticateToken,
  projectStatusMiddleware.deleteProjectStatus.bind(projectStatusMiddleware),
  projectStatusService.deleteProjectStatus.bind(projectStatusService)
);

export default router;

# ----- End of src/routes/projectStatusRoute.ts -----


# ----- Start of src/routes/projectTypeRoute.ts -----

import { Router } from "express";
import ProjectTypeService from "../services/projectType";
import ProjectTypeMiddleware from "../middlewares/projectType";
import authorizeRoles from "../middlewares/roleMiddleware";
import authenticateToken from "../middlewares/auth";

const projectTypeRoute = Router();
const projectTypeService = new ProjectTypeService();
const projectTypeMiddleware = new ProjectTypeMiddleware();

projectTypeRoute.get(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  projectTypeService.getProjectTypes.bind(projectTypeService)
);
projectTypeRoute.get(
  "/:id",
  authenticateToken,

  authorizeRoles("Admin"),
  projectTypeMiddleware.getProjectType.bind(projectTypeMiddleware),
  projectTypeService.getProjectType.bind(projectTypeService)
);
projectTypeRoute.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  projectTypeMiddleware.createProjectType.bind(projectTypeMiddleware),
  projectTypeService.createProjectType.bind(projectTypeService)
);
projectTypeRoute.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  projectTypeMiddleware.updateProjectType.bind(projectTypeMiddleware),
  projectTypeService.updateProjectType.bind(projectTypeService)
);
projectTypeRoute.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  projectTypeMiddleware.deleteProjectType.bind(projectTypeMiddleware),
  projectTypeService.deleteProjectType.bind(projectTypeService)
);

export default projectTypeRoute;

# ----- End of src/routes/projectTypeRoute.ts -----


# ----- Start of src/routes/serviceCompanyRoute.ts -----

import { Router } from "express";
import ServiceCompanyService from "../services/serviceCompany";
import ServiceCompanyMiddleware from "../middlewares/serviceCompany";
import authenticateToken from "../middlewares/auth";
import authorizeRoles from "../middlewares/roleMiddleware";

const serviceCompanyRoute = Router();
const serviceCompanyService = new ServiceCompanyService();
const serviceCompanyMiddleware = new ServiceCompanyMiddleware();

serviceCompanyRoute.get(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyService.getServiceCompanies.bind(serviceCompanyService)
);
serviceCompanyRoute.get(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyMiddleware.deleteServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.getServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyMiddleware.createServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.createServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyMiddleware.updateServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.updateServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyMiddleware.deleteServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.deleteServiceCompany.bind(serviceCompanyService)
);

export default serviceCompanyRoute;

# ----- End of src/routes/serviceCompanyRoute.ts -----


# ----- Start of src/routes/timesheetRoute.ts -----

import { Router } from "express";
import TimeSheetService from "../services/timeSheet";
import TimesheetMiddleware from "../middlewares/timesheet";
import authenticateToken from "../middlewares/auth";

const router = Router();
const timeSheetService = new TimeSheetService();
const timeSheetMiddleware = new TimesheetMiddleware();

// GET all timeSheet
router.get(
  "/",
  authenticateToken,
  timeSheetService.getTimeSheets.bind(timeSheetService)
);
// GET filtered timesheets
router.get(
  "/home",
  authenticateToken,
  timeSheetService.getTimesheetsByUser.bind(timeSheetService)
);
// GET timeSheet by ID
router.get(
  "/:id",
  authenticateToken,
  timeSheetMiddleware.validateGet.bind(timeSheetMiddleware),
  timeSheetService.getTimeSheet.bind(timeSheetService)
);

// CREATE a new timeSheet
router.post(
  "/",
  authenticateToken,
  timeSheetMiddleware.validateCreate.bind(timeSheetMiddleware),
  timeSheetService.createTimeSheet.bind(timeSheetService)
);

// UPDATE a timeSheet
router.patch(
  "/:id",
  authenticateToken,
  // timeSheetMiddleware.validateUpdate.bind(timeSheetMiddleware),
  timeSheetService.updateTimeSheet.bind(timeSheetService)
);

// DELETE a timeSheet
router.delete(
  "/:id",
  authenticateToken,
  timeSheetMiddleware.validateDelete.bind(timeSheetMiddleware),
  timeSheetService.deleteTimeSheet.bind(timeSheetService)
);

export default router;

# ----- End of src/routes/timesheetRoute.ts -----


# ----- Start of src/routes/uploadRoute.ts -----

// src/routes/uploadRoute.ts

import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { IFile } from "../interfaces/file";
import FileService from "../services/file";
import FileValidationMiddleware from "../middlewares/file";
import logger from "../utils/logger";
import authenticateToken from "../middlewares/auth";
import uploadLimiter from "../middlewares/rateLimiter";

const uploadRouter = Router();
const fileService = new FileService();
const fileValidation = new FileValidationMiddleware();

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || "uploads";
    const uploadPath = path.join(__dirname, `../../${uploadDir}/`);
    cb(null, uploadPath);
    logger.info("Setting upload destination.", { uploadPath });
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedFileName = file.originalname.replace(
      /[^a-zA-Z0-9.\-_]/g,
      ""
    );
    cb(null, `${uniqueSuffix}-${sanitizedFileName}`);
    logger.info("Generating unique filename.", {
      filename: `${uniqueSuffix}-${sanitizedFileName}`,
    });
  },
});

// File filter to validate file types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "image/gif",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn("Invalid file type attempted.", { mimetype: file.mimetype });
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
  }
};

// const upload = multer({
//   storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
//   fileFilter,
// });

// Route: POST /api/v1/web/upload/single
// uploadRouter.post(
//   "/single",
//   authenticateToken,
//   uploadLimiter,
//   upload.single("file"), // Must match frontend's field name
//   fileValidation.validateUpload,
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const newFile = await fileService.uploadSingleFiee(req);

//       if (!newFile || newFile.length === 0) {
//         logger.warn("No file data returned from service.");
//         return res.status(500).json({ message: "Failed to upload file." });
//       }

//       const fileId = newFile[0]._id;

//       logger.info("File uploaded successfully.", {
//         fileId,
//         filePath: newFile[0].path,
//       });

//       res.status(201).json({
//         message: "File uploaded successfully.",
//         fileId,
//         filePath: newFile[0].path,
//         fileURL: `${process.env.BASE_URL}/uploads/${path.basename(
//           newFile[0].path
//         )}`,
//       });
//     } catch (error: any) {
//       logger.error("File Upload Error:", { error: error.message });
//       if (error instanceof multer.MulterError) {
//         // Handle Multer-specific errors
//         return res.status(400).json({ message: error.message });
//       }
//       res
//         .status(500)
//         .json({ message: "Internal Server Error.", error: error.message });
//     }
//   }
// );

// Route: POST /api/v1/web/upload/multiple
// uploadRouter.post(
//   "/multiple",
//   authenticateToken,
//   uploadLimiter,
//   upload.array("files", 10), // 'files' should match frontend's field name
//   fileValidation.validateUploadMultiple,
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const newFiles = await fileService.uploadMultipleFiles(req);

//       if (!newFiles || newFiles.length === 0) {
//         logger.warn("No file data returned from service.");
//         return res.status(500).json({ message: "Failed to upload files." });
//       }

//       const fileIds = newFiles.map((file: IFile) => file._id);

//       logger.info("Multiple files uploaded successfully.", { fileIds });

//       res.status(201).json({
//         message: "Files uploaded successfully.",
//         fileIds,
//         filePaths: newFiles.map((file: IFile) => file.path),
//         fileURLs: newFiles.map(
//           (file: IFile) =>
//             `${process.env.BASE_URL}/uploads/${path.basename(file.path)}`
//         ),
//       });
//     } catch (error: any) {
//       logger.error("Multiple File Upload Error:", { error: error.message });
//       if (error instanceof multer.MulterError) {
//         // Handle Multer-specific errors
//         return res.status(400).json({ message: error.message });
//       }
//       res
//         .status(500)
//         .json({ message: "Internal Server Error.", error: error.message });
//     }
//   }
// );

export default uploadRouter;

# ----- End of src/routes/uploadRoute.ts -----


# ----- Start of src/routes/verifyTokenRoute.ts -----

// src/routes/verifyTokenRoute.ts

import authenticateToken from "../middlewares/auth";
import { Router } from "express";

const verifyTokenRoute = Router();

verifyTokenRoute.get("/", authenticateToken, (req: any, res) => {
  if (!req.user) {
    // Additional check to ensure req.user is defined
    return res.status(401).json({
      success: false,
      message: "Authentication failed: No user data",
    });
  }

  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default verifyTokenRoute;

# ----- End of src/routes/verifyTokenRoute.ts -----


# ----- Start of src/routes/workerRoute.ts -----

import { Router } from "express";
import WorkerService from "../services/worker";
import WorkerMiddleware from "../middlewares/worker";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";

const workerRoute = Router();
const workerService = new WorkerService();
const workerMiddleware = new WorkerMiddleware();

workerRoute.get(
  "/",
  authenticateToken,
  workerService.getWorkers.bind(workerService)
);
workerRoute.get(
  "/:id",
  authenticateToken,
  workerMiddleware.getWorker.bind(workerMiddleware),
  workerService.getWorker.bind(workerService)
);
workerRoute.post(
  "/",
  authenticateToken,
  validateUniqueEmail,
  workerMiddleware.createWorker.bind(workerMiddleware),
  workerService.createWorker.bind(workerService)
);
workerRoute.patch(
  "/:id",
  authenticateToken,
  workerMiddleware.updateWorker.bind(workerMiddleware),
  workerService.updateWorker.bind(workerService)
);
workerRoute.delete(
  "/:id",
  authenticateToken,
  workerMiddleware.deleteWorker.bind(workerMiddleware),
  workerService.deleteWorker.bind(workerService)
);

export default workerRoute;

# ----- End of src/routes/workerRoute.ts -----


# ----- Start of src/services/activity.ts -----

import { Request, Response } from "express";
import ActivityRepository from "../database/repositories/activity";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";
import { ActivityStatusModel } from "../database/models/activityStatus";
import ProjectRepository from "../database/repositories/project";
import { ProjectModel } from "../database/models/project";
import { ActivityManagerModel } from "../database/models/activityManager";
import { ActivityTypeModel } from "../database/models/activityType";
import { WorkerModel } from "../database/models/worker";
import { IWorker } from "../interfaces/worker";
import { ProjectStatusModel } from "../database/models/projectStatus";
import { ObjectId } from "mongodb"; // Make sure to import ObjectId
import { ActivityModel } from "../database/models/activity";
import { Types } from "mongoose";

class ActivityService {
  private activityRepository = new ActivityRepository();
  private projectRepository = new ProjectRepository();

  /**
   * Get activity count by status for a specific project.
   */
  public async getActivityCountByStatus(req: Request, res: Response) {
    try {
      const { projectId } = req.query;

      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }

      const counts = await this.activityRepository.getActivityCountByStatus(
        projectId.toString()
      );

      res.sendFormatted(
        counts,
        "Activity counts by status retrieved successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "ActivityService-getActivityCountByStatus");
      res.sendError(error, "Failed to retrieve activity counts by status", 500);
    }
  }

  /**
   * Fetch a paginated list of activities with dynamic filters based on the user's role.
   */
  public async getActivities(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);

      const { status, projectId } = req.query; // Optional project and status filters
      const userId = req.user?.id; // User ID from middleware
      const userRole = req.user?.role; // User Role from middleware
      const projectIdString =
        typeof projectId === "string" ? projectId : undefined;
      const statusString = typeof status === "string" ? status : undefined;

      const filters = this.getFilters(
        userRole,
        userId,
        projectIdString,
        statusString
      );

      const activities = await this.activityRepository.getActivities(
        req,
        pagination,
        search,
        filters
      );

      res.sendFormatted(activities, "Activities retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-getActivities");
      res.sendError(error, "Failed to retrieve activities", 500);
    }
  }

  /**
   * Fetch a single activity by its ID.
   */
  public async getActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activity = await this.activityRepository.getActivity(req, id);

      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      res.json(activity);
    } catch (error) {
      await logError(error, req, "ActivityService-getActivity");
      res.sendError(error, "Failed to retrieve activity", 500);
    }
  }

  /**
   * Create a new activity with appropriate default values and status.
   */
  public async createActivity(req: Request, res: Response) {
    try {
      const activityData = this.initializeActivityData(req);
      activityData.status = await this.determineActivityStatus(
        activityData,
        null,
        req.user?.role
      );
      const newActivity = await this.activityRepository.createActivity(
        req,
        activityData
      );

      res.sendFormatted(newActivity, "Activity created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityService-createActivity");
      res.sendError(error, "Activity creation failed", 500);
    }
  }

  /**
   * Update an existing activity's status and trigger project status update if necessary.
   */
  public async updateActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityData = req.body;

      // Get the current activity
      const currentActivity = await this.activityRepository.getActivity(
        req,
        id
      );
      if (!currentActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Determine the new status based on activity conditions
      const determinedStatus = await this.determineActivityStatus(
        activityData,
        currentActivity,
        req.user?.role
      );

      // Compare and update status only if it differs
      if (currentActivity.status?.toString() !== determinedStatus) {
        activityData.previousStatus = currentActivity.status;
        activityData.status = determinedStatus;
      }

      // Update the activity in the database
      const updatedActivity = await this.activityRepository.updateActivity(
        req,
        id,
        activityData
      );
      // Trigger project status update if the activity status changes
      await this.determineProjectStatus(new ObjectId(id), req);

      res.sendFormatted(updatedActivity, "Activity updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-updateActivity");
      res.sendError(error, "Activity update failed", 500);
    }
  }

  public async deleteActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deletedActivity = await this.activityRepository.deleteActivity(
        req,
        id
      );

      res.sendFormatted(deletedActivity, "Activity deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ActivityService-deleteActivity");
      res.sendError(error, "Activity deletion failed", 500);
    }
  }

  public async bulkCreateActivities(req: Request, res: Response) {
    try {
      const activities = req.body;

      if (!Array.isArray(activities) || activities.length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid or empty activities array" });
      }

      const invalidRows: any[] = [];
      const validActivities: any[] = [];

      // Process each activity to validate and prepare data
      for (const [index, activity] of activities.entries()) {
        const errors: string[] = [];

        try {
          // Validate project ID
          const projectId = await this.getProjectId(activity.project);
          if (!projectId)
            errors.push(`Invalid project ID: ${activity.project}`);

          // Validate activity type ID
          const activityTypeId = await this.getActivityTypeId(activity.type);
          if (!activityTypeId)
            errors.push(`Invalid activity type ID: ${activity.type}`);

          // Validate activity manager ID
          const activityManagerId = await this.getActivityManagerId(
            activity.activityManager
          );
          if (!activityManagerId)
            errors.push(
              `Invalid activity manager: ${activity.activityManager}`
            );

          // Parse and validate workers
          let workerIds: string[] = [];
          try {
            const workers = JSON.parse(activity.worker);
            workerIds = await this.getWorkerIds(workers);
          } catch (e) {
            errors.push(`Invalid worker data: ${activity.worker}`);
          }

          // If there are validation errors, skip this activity
          if (errors.length > 0) {
            invalidRows.push({ row: index + 1, issues: errors });
            continue; // Skip the current activity if it's invalid
          }

          if (!projectId) return;

          // Initialize and validate activity data
          const activityData = this.initializeActivityData({
            body: {
              ...activity,
              project: new ObjectId(projectId),
              activityManager: activityManagerId,
              type: activityTypeId,
              worker: workerIds,
            },
            user: req.user,
          });

          // Set activity status
          activityData.status = await this.determineActivityStatus(
            activityData,
            null,
            req.user?.role
          );

          let newActivity;
          if (activity.customId) {
            // Update existing activity
            newActivity =
              await this.activityRepository.updateActivityByCustomId(
                req,
                activity.customId,
                activityData
              );
          } else {
            // Create new activity
            newActivity = await this.activityRepository.createActivity(
              req,
              activityData
            );
          }

          // Add valid activity to the list
          validActivities.push(newActivity);
        } catch (err: unknown) {
          // Log the error
          await logError(err, req, "ActivityService-bulkCreateActivities");

          // Add a generic error message for the failed row
          errors.push("Unknown error occurred while processing this activity");
          invalidRows.push({ row: index + 1, issues: errors });
        }
      }

      // If there are invalid rows, return an error response with details
      if (invalidRows.length > 0) {
        return res.status(400).json({
          message: "Bulk upload failed. Invalid rows found.",
          invalidRows, // Send row details with error messages
        });
      }

      // Send successful activities as response
      res.sendFormatted(
        validActivities,
        "Bulk upload completed successfully",
        201
      );
    } catch (error) {
      // Log the error and send a formatted response
      await logError(error, req, "ActivityService-bulkCreateActivities");
      res.sendError(error, "Bulk upload failed", 500);
    }
  }

  private async getProjectId(customId: string): Promise<string | null> {
    const project = await ProjectModel.findOne({ customId });
    if (!project) {
      console.warn(`Project with customId ${customId} not found`);
      return null; // Returning null instead of throwing an error could make this more flexible
    }
    return project._id.toString();
  }
  private async getActivityManagerId(email: string): Promise<string | null> {
    const manager = await ActivityManagerModel.findOne({ email });
    if (!manager) {
      console.warn(`ActivityManager with email ${email} not found`);
      return null; // Return null if not found instead of throwing an error
    }

    return manager._id.toString();
  }

  private async getActivityTypeId(name: string): Promise<string | null> {
    const activityType = await ActivityTypeModel.findOne({ name });
    if (!activityType) {
      console.warn(`ActivityType with name ${name} not found`);
      return null; // Returning null instead of throwing an error for missing types
    }
    return activityType._id.toString();
  }
  private async getWorkerIds(emails: string[]): Promise<string[]> {
    const workers = await WorkerModel.find({ email: { $in: emails } }).lean<
      IWorker[]
    >();

    const foundEmails = workers.map((worker) => worker.email);
    const missingEmails = emails.filter(
      (email) => !foundEmails.includes(email)
    );

    if (missingEmails.length) {
      console.warn(`Missing workers: ${missingEmails.join(", ")}`);
    }

    return workers.map((worker) => worker._id);
  }

  /**
   * Dynamically build filters based on user role and query parameters.
   */
  private getFilters(
    userRole: string | undefined,
    userId: string | undefined,
    projectId: string | undefined,
    status: string | undefined
  ): Record<string, any> {
    const filters: any = {};

    if (projectId) {
      filters.project = projectId; // Filter by project ID if provided
    }

    if (status) {
      filters.status = status; // Filter by status if provided
    }

    if (userRole) {
      switch (userRole) {
        case "Customer":
          filters.customer = userId; // Activities associated with the customer
          break;
        case "ActivityManager":
          filters.activityManager = userId; // Activities managed by the user
          break;
        case "Worker":
          filters.worker = { $in: [userId] }; // Activities assigned to the worker
          break;
        case "ProjectManager":
          filters["project.projectManager"] = userId; // Projects managed by the user
          break;
        case "Admin":
          // No filters for Admins (they can view all activities)
          break;
        default:
          throw new Error("Access denied");
      }
    }

    return filters;
  }

  private statusCache: Record<string, string> = {};

  /**
   * Get the status ID by its name, caching results for performance.
   */
  private async getStatusIdByName(statusName: string): Promise<string> {
    if (this.statusCache[statusName]) {
      return this.statusCache[statusName];
    }

    const status = await ActivityStatusModel.findOne({ name: statusName });
    if (!status) {
      throw new Error(`Activity Status with name "${statusName}" not found`);
    }

    this.statusCache[statusName] = status._id.toString();
    return this.statusCache[statusName];
  }
  private projectStatusCache: Record<string, string> = {};

  private async getStatusIdByNameProject(
    projectStatusName: string
  ): Promise<string> {
    if (this.projectStatusCache[projectStatusName]) {
      return this.projectStatusCache[projectStatusName];
    }

    const status = await ProjectStatusModel.findOne({
      name: projectStatusName,
    });
    if (!status) {
      throw new Error(
        `Project Status with name "${projectStatusName}" not found`
      );
    }
    this.projectStatusCache[projectStatusName] = status._id.toString();
    return this.projectStatusCache[projectStatusName];
  }

  /**
   * Initialize default values for a new activity.
   */
  private initializeActivityData(data: { body: any; user?: any }): any {
    const activityData = data.body || {};

    // Ensure required properties are initialized
    if (!activityData.hoursSpent) activityData.hoursSpent = 0;
    if (!activityData.updatedBy && data.user?.role) {
      activityData.updatedBy = data.user.role;
    }

    return activityData;
  }

  /**
   * Validate if a given status ID is active and valid.
   */
  private async validateStatus(statusId: string): Promise<boolean> {
    const statusExists = await ActivityStatusModel.exists({
      _id: statusId,
      isActive: true,
    });
    return !!statusExists;
  }
  private async getActivitiesByProject(projectId: ObjectId): Promise<any[]> {
    return await ActivityModel.find({ project: projectId });
  }
  private async getActivityStatusNameById(statusId: string): Promise<string> {
    const status = await ActivityStatusModel.findById(statusId);
    return status ? status.name : "";
  }

  /**
   * Determine the new status based on activity data and user role.
   */
  private async determineActivityStatus(
    activityData: any,
    currentActivity?: any,
    userRole?: string
  ): Promise<string> {
    let currentActivityData: any = null;
    if (currentActivity) {
      currentActivityData = currentActivity.toObject
        ? currentActivity.toObject()
        : currentActivity._doc;
    }

    // Merge current activity data with new data
    const filledActivityData = { ...currentActivityData, ...activityData };

    let activityStatus = "";

    // Determine activity status
    if (!filledActivityData.targetOperationDate) {
      activityStatus = await this.getStatusIdByName("No Target");
    } else if (!filledActivityData.forecastDate) {
      activityStatus = await this.getStatusIdByName("To Be Planned");
    } else if (
      !filledActivityData.worker ||
      filledActivityData.worker.length === 0
    ) {
      activityStatus = await this.getStatusIdByName("To Be Assigned");
    } else if (filledActivityData.status === "Submitted") {
      activityStatus = await this.getStatusIdByName("Submitted");
    } else if (filledActivityData.status === "Approved") {
      activityStatus = await this.getStatusIdByName("Approved");
    } else if (filledActivityData.status === "Rejected") {
      activityStatus = await this.getStatusIdByName("Rejected");
    } else if (filledActivityData.status === "Suspended") {
      activityStatus = await this.getStatusIdByName("Suspended");
    } else if (filledActivityData.status === "Blocked") {
      activityStatus = await this.getStatusIdByName("Blocked");
    } else if (userRole === "Admin" && filledActivityData.unblock) {
      activityStatus = currentActivity.previousStatus;
    } else {
      activityStatus = await this.getStatusIdByName("In Progress");
    }

    return activityStatus;
  }

  private async determineProjectStatus(
    activityId: ObjectId,
    req: Request
  ): Promise<void> {
    // Step 1: Fetch the activity by its ID
    const activity = await this.getActivityById(activityId);
    if (!activity || !activity.project) {
      throw new Error("Activity or associated project not found");
    }

    // Step 2: Get the project ID from the activity
    const projectId =
      activity.project instanceof Types.ObjectId
        ? activity.project
        : activity.project._id;

    // Step 3: Fetch all activities associated with the project
    const projectActivities = await this.getActivitiesByProject(projectId);
    if (!projectActivities || projectActivities.length === 0) {
      throw new Error("No activities found for the project");
    }

    // Step 4: Fetch status names for comparison
    const statusNames = await Promise.all(
      projectActivities.map(async (activity) => {
        return this.getActivityStatusNameById(activity.status);
      })
    );
    let status: ObjectId;
    // Step 5: Determine project status based on activity statuses

    // Case 1: All activities are approved -> Set project status to "Closed"
    if (statusNames.every((status) => status === "Approved")) {
      console.log(
        "All activities approved. Updating project status to 'Closed'."
      );

      status = new ObjectId(await this.getStatusIdByNameProject("Closed"));
      await this.projectRepository.updateProjectStatus(
        req,
        projectId.toString(),
        status
      );
      return;
    }
    // Case 2: None of the activities are blocked or suspended -> Set project status to "Open"
    if (statusNames.some((status) => ["Suspended"].includes(status))) {
      console.log(
        "Some activities are Suspended. Updating project status to 'Suspended'."
      );

      status = new ObjectId(await this.getStatusIdByNameProject("Suspended"));
      await this.projectRepository.updateProjectStatus(
        req,
        projectId.toString(),
        status
      );
    }
    if (statusNames.some((status) => ["Blocked"].includes(status))) {
      console.log(
        "Some activities are Blocked. Updating project status to 'Blocked'."
      );

      status = new ObjectId(await this.getStatusIdByNameProject("Blocked"));
      await this.projectRepository.updateProjectStatus(
        req,
        projectId.toString(),
        status
      );
    }
    // Case 2: None of the activities are blocked or suspended -> Set project status to "Open"
    if (
      !statusNames.some((status) => ["Suspended", "Blocked"].includes(status))
    ) {
      console.log(
        "No activities are blocked or suspended. Updating project status to 'Open'."
      );

      status = new ObjectId(await this.getStatusIdByNameProject("Open"));
      await this.projectRepository.updateProjectStatus(
        req,
        projectId.toString(),
        status
      );
    }

    console.log("No project status update needed.");
  }

  public async getActivityById(activityId: ObjectId): Promise<any | null> {
    return await ActivityModel.findById(activityId).populate("project").exec();
  }
}

export default ActivityService;

# ----- End of src/services/activity.ts -----


# ----- Start of src/services/activityFile.ts -----

import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import FileModel from "../database/models/file";
import ActivityFileModel from "../database/models/activityFile";
import mongoose from "mongoose";

export const createActivityFiles = async (
  comments: string,
  activityId: string,
  files: any[],
  uploadPath: string,
  userId?: string
) => {
  try {
    const fileRecords: {
      file: mongoose.Types.ObjectId;
      status: "Submitted" | "Approved" | "Rejected";
      submittedBy?: mongoose.Types.ObjectId;
      comments?: string;
    }[] = [];

    for (const file of files) {
      const uniqueFileName = `${uuidv4()}-${file.originalname}`;
      const fullPath = path.join(
        __dirname,
        `../../uploads/activity/${activityId}/${uniqueFileName}`
      );

      console.log("Full Path:", fullPath);
      console.log("Full Path:", fullPath);
      console.log("Full Path:", fullPath);

      // Ensure the directory exists
      const directory = path.dirname(fullPath);
      console.log("Directory:", directory);
      if (!fs.existsSync(directory)) {
        console.log("Directory does not exist. Creating...");
        fs.mkdirSync(directory, { recursive: true });
      }

      // Check file buffer
      if (!file.buffer) {
        throw new Error(`File buffer is empty for file: ${file.originalname}`);
      }

      // Save physical file to disk
      try {
        fs.writeFileSync(fullPath, file.buffer);
        console.log("File written successfully:", fullPath);
      } catch (error) {
        console.error("Error writing file:", error);
        throw new Error(`Failed to write file: ${error}`);
      }

      // Save file metadata in the File collection
      const fileDoc = await FileModel.create({
        fileName: uniqueFileName,
        mimeType: file.mimetype,
        size: file.size,
        path: fullPath,
        url: `/uploads/activity/${activityId}/${uniqueFileName}`,
      });

      fileRecords.push({
        file: fileDoc._id as mongoose.Types.ObjectId,
        status: "Submitted",
        submittedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        comments: comments,
      });
    }

    let activityFile = await ActivityFileModel.findOne({ activityId });
    if (!activityFile) {
      activityFile = new ActivityFileModel({ activityId, files: fileRecords });
    } else {
      activityFile.files.push(...fileRecords);
    }
    await activityFile.save();

    return activityFile;
  } catch (error) {
    throw new Error(`Error creating activity files: ${error}`);
  }
};

export const getActivityFiles = async (activityId: string) => {
  try {
    return await ActivityFileModel.findOne({ activityId }).populate(
      "files.file"
    );
  } catch (error) {
    throw new Error(`Error fetching activity files: ${error}`);
  }
};

export const updateActivityFileStatus = async (
  activityId: string,
  fileId: string,
  status: "Submitted" | "Approved" | "Rejected", // Explicitly enforce the type
  comments?: string
) => {
  try {
    const activityFile = await ActivityFileModel.findOne({ activityId });
    if (!activityFile) {
      throw new Error("Activity file not found");
    }

    const file = activityFile.files.find(
      (f: any) => f.file.toString() === fileId
    );
    if (!file) {
      throw new Error("File not found");
    }

    file.status = status; // Now TypeScript will accept this
    if (comments) {
      file.comments = comments;
    }

    await activityFile.save();
    return activityFile;
  } catch (error) {
    throw new Error(`Error updating activity file: ${error}`);
  }
};

export const deleteActivityFile = async (
  activityId: string,
  fileId: string
) => {
  try {
    const activityFile = await ActivityFileModel.findOne({ activityId });
    if (!activityFile) {
      throw new Error("Activity file not found");
    }

    const fileIndex = activityFile.files.findIndex(
      (f: any) => f.file.toString() === fileId
    );
    if (fileIndex === -1) {
      throw new Error("File not found");
    }

    const [file] = activityFile.files.splice(fileIndex, 1);
    await activityFile.save();

    // Remove the file metadata and optionally delete physical file
    const fileDoc = await FileModel.findByIdAndDelete(file.file);
    if (fileDoc?.path) {
      fs.unlinkSync(fileDoc.path);
    }

    return activityFile;
  } catch (error) {
    throw new Error(`Error deleting activity file: ${error}`);
  }
};

# ----- End of src/services/activityFile.ts -----


# ----- Start of src/services/activityManager.ts -----

// src/services/activityManager.ts

import { Request, Response } from "express";
import ActivityManagerRepository from "../database/repositories/activityManager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { hashPassword } from "../utils/passwordUtils";

class ActivityManagerService {
  private activityManagerRepository: ActivityManagerRepository;

  constructor() {
    this.activityManagerRepository = new ActivityManagerRepository();
  }

  public async getActivityManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityManagers =
        await this.activityManagerRepository.getActivityManagers(
          req,
          pagination,
          search
        );
      res.sendArrayFormatted(
        activityManagers,
        "Customers retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ActivityManagerService-getActivityManagers");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async getActivityManagerById(req: Request, res: Response) {
    try {
      const activityManager =
        await this.activityManagerRepository.getActivityManagerById(
          req,
          req.params.id
        );
      res.json(activityManager);
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerService-getActivityManagerById"
      );
      res.status(404).json({ error: error });
    }
  }

  public async createActivityManager(req: Request, res: Response) {
    try {
      // Hash password
      req.body.password = await hashPassword(req.body.password);
      const newActivityManager =
        await this.activityManagerRepository.createActivityManager(
          req,
          req.body
        );
      res.status(201).json(newActivityManager);
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerService-createActivityManager"
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async updateActivityManager(req: Request, res: Response) {
    try {
      if (req.body.password) {
        req.body.password = await hashPassword(req.body.password);
      }

      const updatedActivityManager =
        await this.activityManagerRepository.updateActivityManager(
          req,
          req.params.id,
          req.body
        );

      res.json(updatedActivityManager);
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerService-updateActivityManager"
      );
      res.status(404).json({ error: error });
    }
  }

  public async deleteActivityManager(req: Request, res: Response) {
    try {
      const deletedActivityManager =
        await this.activityManagerRepository.deleteActivityManager(
          req,
          req.params.id
        );
      res.json(deletedActivityManager);
    } catch (error) {
      await logError(
        error,
        req,
        "ActivityManagerService-deleteActivityManager"
      );
      res.status(404).json({ error: error });
    }
  }
}

export default ActivityManagerService;

# ----- End of src/services/activityManager.ts -----


# ----- Start of src/services/activityStatus.ts -----

import { Request, Response } from "express";
import ActivityStatusRepository from "../database/repositories/activityStatus";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ActivityStatusService {
  private activityStatusRepository: ActivityStatusRepository;

  constructor() {
    this.activityStatusRepository = new ActivityStatusRepository();
  }

  public async getActivityStatuses(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityStatuses = await this.activityStatusRepository.getActivityStatuses(req, pagination, search);
      res.sendArrayFormatted(activityStatuses, "ActivityStatuses retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-getActivityStatuses");
      res.sendError(error, "ActivityStatuses retrieval failed");
    }
  }

  public async getActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityStatus = await this.activityStatusRepository.getActivityStatusById(req, id);
      res.sendFormatted(activityStatus, "ActivityStatus retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-getActivityStatus");
      res.sendError(error, "ActivityStatus retrieval failed");
    }
  }

  public async createActivityStatus(req: Request, res: Response) {
    try {
      const activityStatusData = req.body;
      const newActivityStatus = await this.activityStatusRepository.createActivityStatus(req, activityStatusData);
      res.sendFormatted(newActivityStatus, "ActivityStatus created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityStatusService-createActivityStatus");
      res.sendError(error, "ActivityStatus creation failed");
    }
  }

  public async updateActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityStatusData = req.body;
      const updatedActivityStatus = await this.activityStatusRepository.updateActivityStatus(req, id, activityStatusData);
      res.sendFormatted(updatedActivityStatus, "ActivityStatus updated successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-updateActivityStatus");
      res.sendError(error, "ActivityStatus update failed");
    }
  }

  public async deleteActivityStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivityStatus = await this.activityStatusRepository.deleteActivityStatus(req, id);
      res.sendFormatted(deletedActivityStatus, "ActivityStatus deleted successfully");
    } catch (error) {
      await logError(error, req, "ActivityStatusService-deleteActivityStatus");
      res.sendError(error, "ActivityStatus deletion failed");
    }
  }
}

export default ActivityStatusService;

# ----- End of src/services/activityStatus.ts -----


# ----- Start of src/services/activityType.ts -----

import { Request, Response } from "express";
import ActivityTypeRepository from "../database/repositories/activityType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ActivityTypeService {
  private activityTypeRepository: ActivityTypeRepository;

  constructor() {
    this.activityTypeRepository = new ActivityTypeRepository();
  }

  public async getActivityTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityTypes = await this.activityTypeRepository.getActivityTypes(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(activityTypes, "ActivityTypes retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-getActivityTypes");
      res.sendError(error, "ActivityTypes retrieval failed");
    }
  }

  public async getActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityType = await this.activityTypeRepository.getActivityTypeById(req, id);
      res.sendFormatted(activityType, "ActivityType retrieved successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-getActivityType");
      res.sendError(error, "ActivityType retrieval failed");
    }
  }

  public async createActivityType(req: Request, res: Response) {
    try {
      const activityTypeData = req.body;
      const newActivityType = await this.activityTypeRepository.createActivityType(req, activityTypeData);
      res.sendFormatted(newActivityType, "ActivityType created successfully", 201);
    } catch (error) {
      await logError(error, req, "ActivityTypeService-createActivityType");
      res.sendError(error, "ActivityType creation failed");
    }
  }

  public async updateActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activityTypeData = req.body;
      const updatedActivityType = await this.activityTypeRepository.updateActivityType(
        req,
        id,
        activityTypeData
      );
      res.sendFormatted(updatedActivityType, "ActivityType updated successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-updateActivityType");
      res.sendError(error, "ActivityType update failed");
    }
  }

  public async deleteActivityType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedActivityType = await this.activityTypeRepository.deleteActivityType(req, id);
      res.sendFormatted(deletedActivityType, "ActivityType deleted successfully");
    } catch (error) {
      await logError(error, req, "ActivityTypeService-deleteActivityType");
      res.sendError(error, "ActivityType deletion failed");
    }
  }
}

export default ActivityTypeService;

# ----- End of src/services/activityType.ts -----


# ----- Start of src/services/admin.ts -----

import { Request, Response } from "express";
import AdminRepository from "../database/repositories/admin";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { serialize } from "cookie";
import { generateJWTToken } from "./../utils/tokenUtils";
import { comparePasswords, hashPassword } from "./../utils/passwordUtils";

class AdminService {
  public async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      console.log("Login Attempt:", req.body);

      const admin = await this.adminRepository.getAdminByEmail(req, email);
      console.log("Admin Found:", admin);

      if (!admin) {
        res.status(401).json({
          success: false,
          message: "Authentication failed: Invalid email",
        });
        return;
      }

      // Compare passwords
      const isMatch = await comparePasswords(password, admin.password);
      console.log("Password Match Result:", isMatch);

      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: "Authentication failed: Invalid password",
        });
        return;
      }

      // Generate JWT token
      const token = generateJWTToken(admin); // Ensure this function signs the token correctly

      // Set the token as an HTTP-Only cookie
      res.cookie("token", token, {
        httpOnly: true, // Prevents JavaScript access
        secure: process.env.NODE_ENV === "production", // Ensures cookie is sent over HTTPS
        sameSite: "strict", // Mitigates CSRF
        maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
      });

      // Respond with a success message without the token
      res.status(200).json({
        success: true,
        message: "Login successful",
      });
    } catch (error) {
      await logError(error, req, "AdminService-login");
      res.status(500).json({
        success: false,
        message: "Login failed: Internal server error",
      });
    }
  }

  public async getCurrentUser(req: Request, res: Response) {
    try {
      const user = req.user; // Attached by authenticateToken middleware

      // Fetch admin details if needed
      if (!user) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve user information",
        });
      }
      const admin = await this.adminRepository.getAdminById(req, user.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        user: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          // Add other necessary fields
        },
      });
    } catch (error) {
      await logError(error, req, "AdminService-getCurrentUser");
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user information",
      });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      await logError(error, req, "AdminService-logout");
      res.status(500).json({
        success: false,
        message: "Logout failed: Internal server error",
      });
    }
  }

  private adminRepository: AdminRepository;

  constructor() {
    this.adminRepository = new AdminRepository();
  }

  public async getAdmins(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const admins = await this.adminRepository.getAdmins(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(admins, "Admins retrieved successfully");
    } catch (error) {
      await logError(error, req, "AdminService-getAdmins");
      res.sendError(error, "Admins retrieval failed");
    }
  }

  public async getAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const admin = await this.adminRepository.getAdminById(req, id);
      res.json(admin);
    } catch (error) {
      await logError(error, req, "AdminService-getAdmin");
      res.sendError(error, "Admin retrieval failed");
    }
  }

  public async createAdmin(req: Request, res: Response) {
    try {
      const adminData = req.body;
      // Hash password
      adminData.password = await hashPassword(adminData.password);

      const newAdmin = await this.adminRepository.createAdmin(req, adminData);
      res.sendFormatted(newAdmin, "Admin created successfully", 201);
    } catch (error) {
      await logError(error, req, "AdminService-createAdmin");
      res.sendError(error, "Admin creation failed");
    }
  }

  public async updateAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminData = req.body;
      // Hash password
      if (adminData.password) {
        adminData.password = await hashPassword(adminData.password);
      }
      const updatedAdmin = await this.adminRepository.updateAdmin(
        req,
        id,
        adminData
      );
      res.sendFormatted(updatedAdmin, "Admin updated successfully");
    } catch (error) {
      await logError(error, req, "AdminService-updateAdmin");
      res.sendError(error, "Admin update failed");
    }
  }

  public async deleteAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedAdmin = await this.adminRepository.deleteAdmin(req, id);
      res.sendFormatted(deletedAdmin, "Admin deleted successfully");
    } catch (error) {
      await logError(error, req, "AdminService-deleteAdmin");
      res.sendError(error, "Admin deletion failed");
    }
  }
}

export default AdminService;

# ----- End of src/services/admin.ts -----


# ----- Start of src/services/authService.ts -----

// src/services/authService.ts

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { AdminModel } from "../database/models/admin";
import { CustomerModel } from "../database/models/customer";
import { WorkerModel } from "../database/models/worker";
import {
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
  NODE_ENV,
} from "../config";
import { ActivityManagerModel } from "../database/models/activityManager";
import { ProjectManagerModel } from "../database/models/projectManager";
interface UserModel {
  findOne: (query: object) => Promise<any>;
}

const getUserModel = (role: string): UserModel | null => {
  switch (role) {
    case "Admin":
      return AdminModel;
    case "Customer":
      return CustomerModel;
    case "ActivityManager":
      return ActivityManagerModel;
    case "ProjectManager":
      return ProjectManagerModel;
    case "Worker":
      return WorkerModel;
    default:
      return null;
  }
};

export const authenticateUser = async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  try {
    const userModel = getUserModel(role);

    if (!userModel) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid email or password",
      });
    }

    // Generate JWT token with role
    const payload = {
      id: user._id,
      email: user.email,
      role: role, // Include role in the payload
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "1d",
    });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRE, // e.g., "10d"
    });

    // Set the token as an HTTP-Only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: NODE_ENV === "production", // Set to true in production
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    });

    // Set the Refresh Token as an HTTP-Only cookie (if using)
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    });
    res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed: Internal server error",
    });
  }
};

# ----- End of src/services/authService.ts -----


# ----- Start of src/services/customer.ts -----

import { Request, Response } from "express";
import CustomerRepository from "../database/repositories/customer";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { hashPassword } from "../utils/passwordUtils";

class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  public async getCustomers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const customers = await this.customerRepository.getCustomers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(customers, "Customers retrieved successfully");
    } catch (error) {
      await logError(error, req, "CustomerService-getCustomers");
      res.sendError(error, "Customers retrieval failed");
    }
  }

  public async getCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await this.customerRepository.getCustomerById(req, id);
      res.json(customer);
    } catch (error) {
      await logError(error, req, "CustomerService-getCustomer");
      res.sendError(error, "Customer retrieval failed");
    }
  }

  public async createCustomer(req: Request, res: Response) {
    try {
      // Hash password
      const customerData = req.body;
      customerData.password = await hashPassword(customerData.password);
      const newCustomer = await this.customerRepository.createCustomer(
        req,
        customerData
      );
      res.sendFormatted(newCustomer, "Customer created successfully", 201);
    } catch (error) {
      await logError(error, req, "CustomerService-createCustomer");
      res.sendError(error, "Customer creation failed");
    }
  }

  public async updateCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customerData = req.body;
      // Hash password
      if (customerData.password) {
        customerData.password = await hashPassword(customerData.password);
      }
      const updatedCustomer = await this.customerRepository.updateCustomer(
        req,
        id,
        customerData
      );
      res.sendFormatted(updatedCustomer, "Customer updated successfully");
    } catch (error) {
      await logError(error, req, "CustomerService-updateCustomer");
      res.sendError(error, "Customer update failed");
    }
  }

  public async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedCustomer = await this.customerRepository.deleteCustomer(
        req,
        id
      );
      res.sendFormatted(deletedCustomer, "Customer deleted successfully");
    } catch (error) {
      await logError(error, req, "CustomerService-deleteCustomer");
      res.sendError(error, "Customer deletion failed");
    }
  }
}

export default CustomerService;

# ----- End of src/services/customer.ts -----


# ----- Start of src/services/error.ts -----

import { Request, Response } from "express";
import ErrorRepository from "../database/repositories/error";
import { IError } from "../interfaces/error";
import { logError } from "../utils/errorLogger";
import { IPagination } from "../interfaces/pagination";
import { paginationHandler } from "../utils/paginationHandler";

class ErrorService {
  private errorRepository: ErrorRepository;

  constructor() {
    this.errorRepository = new ErrorRepository();
  }

  public async getErrors(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const errors = await this.errorRepository.getErrors(req, pagination);
      res.sendFormatted(errors, "Errors retrieved successfully");
    } catch (error) {
      await logError(error, req, "Service-getErrors");
      res.sendError(error, "Error retrieval failed");
    }
  }

  public async resolveError(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const resolvedError = await this.errorRepository.resolveError(req, id);
      if (!resolvedError) {
        res.sendError(null, "Error not found", 404);
        return;
      }
      res.sendFormatted(resolvedError, "Error resolved successfully");
    } catch (error) {
      await logError(error, req, "Service-resolveError");
      res.sendError(error, "Error resolution failed");
    }
  }

  public async deleteError(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedError = await this.errorRepository.deleteError(req, id);
      if (!deletedError) {
        res.sendError(null, "Error not found", 404);
        return;
      }
      res.sendFormatted(deletedError, "Error deleted successfully");
    } catch (error) {
      await logError(error, req, "Service-deleteError");
      res.sendError(error, "Error deletion failed");
    }
  }

  public async batchDeleteErrors(req: Request, res: Response) {
    try {
      const ids = req.body;
      const deletedErrors = await this.errorRepository.batchDeleteErrors(
        req,
        ids
      );
      res.sendFormatted(deletedErrors, "Errors deleted successfully");
    } catch (error) {
      await logError(error, req, "Service-batchDeleteErrors");
      res.sendError(error, "Error deletion failed");
    }
  }
}

export default ErrorService;


# ----- End of src/services/error.ts -----


# ----- Start of src/services/exampleService.ts -----

import { Request, Response } from "express";
import ExampleRepository from "../database/repositories/exampleRepository";
import { IExampleInterface } from "../interfaces/exampleInterface";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";

class ExampleService {
  private exampleRepository: ExampleRepository;

  constructor() {
    this.exampleRepository = new ExampleRepository();
  }

  public async getExamples(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const examples = await this.exampleRepository.getExamples(
        req,
        pagination
      );
      res.sendFormatted(examples, "Examples retrieved successfully");
    } catch (error) {
      await logError(error, req, "Service-getExamples");
      res.sendError(error, "Example retrieval failed");
    }
  }

  public async createExample(req: Request, res: Response) {
    try {
      const example: IExampleInterface = req.body;
      const newExample = await this.exampleRepository.createExample(
        req,
        example
      );
      res.sendFormatted(newExample, "Example created successfully");
    } catch (error) {
      await logError(error, req, "Service-createExample");
      res.sendError(error, "Example creation failed");
    }
  }

  public async updateExample(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const example: Partial<IExampleInterface> = req.body;
      const updatedExample = await this.exampleRepository.updateExample(
        req,
        id,
        example
      );
      if (!updatedExample) {
        res.sendError(null, "Example not found", 404);
        return;
      }
      res.sendFormatted(updatedExample, "Example updated successfully");
    } catch (error) {
      await logError(error, req, "Service-updateExample");
      res.sendError(error, "Example update failed");
    }
  }

  public async deleteExample(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedExample = await this.exampleRepository.deleteExample(
        req,
        id
      );
      if (!deletedExample) {
        res.sendError(null, "Example not found", 404);
        return;
      }
      res.sendFormatted(null, "Example deleted successfully");
    } catch (error) {
      await logError(error, req, "Service-deleteExample");
      res.sendError(error, "Example deletion failed");
    }
  }

  public async findExampleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const example = await this.exampleRepository.findExampleById(req, id);
      if (!example) {
        res.sendError(null, "Example not found", 404);
        return;
      }
      res.sendFormatted(example, "Example retrieved successfully");
    } catch (error) {
      await logError(error, req, "Service-findExampleById");
      res.sendError(error, "Example retrieval failed");
    }
  }
}

export default ExampleService;


# ----- End of src/services/exampleService.ts -----


# ----- Start of src/services/file.ts -----

// src/services/fileService.ts

import FileModel from "../database/models/file";
import { ICreateFile, IFile } from "../interfaces/file";

class FileService {
  /**
   * Create a new file entry
   */
  public async createFile(data: {
    fileName: string;
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
      fileName: string;
      mimeType: string;
      size: number;
      path: string;
      url: string;
    }[]
  ): Promise<ICreateFile[]> {
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

# ----- End of src/services/file.ts -----


# ----- Start of src/services/location.ts -----

import { Request, Response } from "express";
import LocationRepository from "../database/repositories/location";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import {
  LocationCounterModel,
  LocationModel,
} from "../database/models/location";
import { LocationManagerModel } from "../database/models/locationManager";
import { LocationTypeModel } from "../database/models/locationType";

class LocationService {
  private locationRepository: LocationRepository;

  constructor() {
    this.locationRepository = new LocationRepository();
  }

  // Helper function to check for duplicate locationManager name-code pairs
  private async checkDuplicateManagerPairs(locationManagers: any[]) {
    const duplicatePairs = [];

    for (const manager of locationManagers) {
      const existingLocation = await LocationModel.findOne({
        "locationManagers.manager": manager.manager,
        "locationManagers.code": manager.code,
      });

      if (existingLocation) {
        duplicatePairs.push(manager);
      }
    }

    return duplicatePairs;
  }

  public async getLocations(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locations = await this.locationRepository.getLocations(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(
        locations,
        "Locations retrieved successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "LocationService-getLocations");
      res.sendError("", "Locations retrieval failed", 500);
    }
  }

  public async getLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await this.locationRepository.getLocationById(req, id);
      res.sendFormatted(location, "Location retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-getLocation");
      res.sendError(error, "Location retrieval failed", 500);
    }
  }

  public async createLocation(req: Request, res: Response) {
    try {
      const locationData = req.body;

      // Extract and process locationManager data
      const { locationManager } = locationData;
      if (locationManager) {
        const { selectedKeys, customValues } = locationManager;

        // Transform locationManager data into the required schema format
        locationData.locationManagers = selectedKeys.map((key: string) => ({
          manager: key,
          code: customValues[key],
        }));

        // Check for duplicate name-code pairs
        const duplicatePairs = await this.checkDuplicateManagerPairs(
          locationData.locationManagers
        );

        if (duplicatePairs.length > 0) {
          return res.status(400).json({
            message: "Duplicate locationManager name-code pairs detected.",
            duplicates: duplicatePairs,
          });
        }

        // Remove unnecessary fields from the payload
        delete locationData.locationManager;
      }

      // Save location to the database
      const newLocation = await this.locationRepository.createLocation(
        req,
        locationData
      );

      // Return success response
      res.sendFormatted(newLocation, "Location created successfully", 201);
    } catch (error) {
      // Log and handle error
      await logError(error, req, "LocationService-createLocation");
      res.sendError(error, "Location creation failed", 500);
    }
  }

  public async updateLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationData = req.body;

      // Extract and process locationManager data
      const { locationManager } = locationData;
      if (locationManager) {
        const { selectedKeys, customValues } = locationManager;

        // Map customValues to selectedKeys
        locationData.locationManagers = selectedKeys.map((key: string) => ({
          manager: key,
          code: customValues[key],
        }));

        // Check for duplicate name-code pairs
        const duplicatePairs = await this.checkDuplicateManagerPairs(
          locationData.locationManagers
        );

        if (duplicatePairs.length > 0) {
          return res.status(400).json({
            message: "Duplicate locationManager name-code pairs detected.",
            duplicates: duplicatePairs,
          });
        }
      }

      const updatedLocation = await this.locationRepository.updateLocation(
        req,
        id,
        locationData
      );
      res.sendFormatted(updatedLocation, "Location updated successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-updateLocation");
      res.sendError(error, "Location update failed", 500);
    }
  }

  public async deleteLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocation = await this.locationRepository.deleteLocation(
        req,
        id
      );
      res.sendFormatted(deletedLocation, "Location deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-deleteLocation");
      res.sendError(error, "Location deletion failed", 500);
    }
  }

  public async bulkCreateLocations(req: Request, res: Response) {
    try {
      const locations = req.body;

      // Ensure the request body is an array and not empty
      if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({
          message: "Invalid or empty request body.",
        });
      }

      const errorMessages: string[] = [];
      const validLocations: any[] = [];

      // Step 1: Fetch LocationType IDs (handling errors if not found)
      const locationTypes = await LocationTypeModel.find({
        name: { $in: locations.map((loc) => loc.locationType) },
      });
      const locationTypeMap = new Map(
        locationTypes.map((type) => [type.name, type._id])
      );

      if (locationTypes.length !== locations.length) {
        errorMessages.push(
          "Some location types were not found in the database."
        );
      }

      // Step 2: Process each location and validate the data
      for (const loc of locations) {
        const locationErrors: string[] = [];
        const managerErrors: string[] = [];

        const locationTypeId = locationTypeMap.get(loc.locationType);

        // Validate LocationType
        if (!locationTypeId) {
          locationErrors.push(
            `Location type "${loc.locationType}" not found for location "${loc.name}".`
          );
        }

        // Parse and validate locationManager (assuming a specific format for manager data)
        let parsedManagers = [];
        try {
          const managerString = loc.locationManager.trim().slice(1, -1); // Remove square brackets
          const managerPairs = managerString.split("},").map((pair: any) => {
            const cleanedPair = pair.replace(/[{}]/g, "").trim(); // Remove curly braces
            const [key, value] = cleanedPair
              .split(":")
              .map((s: any) => s.trim());
            return { name: key, code: value };
          });

          parsedManagers = managerPairs.filter(
            (manager: any) => manager.name && manager.code
          );
        } catch (error) {
          managerErrors.push(
            `Invalid locationManager format for location "${loc.name}".`
          );
        }

        // Step 3: Check for duplicate locationManager name-code pairs
        const duplicatePairs = await this.checkDuplicateManagerPairs(
          parsedManagers
        );
        if (duplicatePairs.length > 0) {
          managerErrors.push(
            `Duplicate locationManager name-code pairs detected for location "${loc.name}".`
          );
        }

        if (locationErrors.length > 0 || managerErrors.length > 0) {
          errorMessages.push(...locationErrors, ...managerErrors);
          continue; // Skip the current location if it has errors
        }

        // Fetch or create LocationManagers
        const managerIds = await Promise.all(
          parsedManagers.map(async ({ name, code }: any) => {
            let manager = await LocationManagerModel.findOne({ name });
            if (!manager) {
              try {
                manager = await LocationManagerModel.create({ name });
              } catch (error) {
                errorMessages.push(
                  `Error creating manager "${name}" for location "${loc.name}".`
                );
                return null; // Skip this location manager creation
              }
            }
            return { manager: manager._id, code };
          })
        );

        // Step 4: Format valid location data
        validLocations.push({
          ...loc,
          locationType: locationTypeId,
          locationManagers: managerIds.filter(Boolean), // Remove any null values
        });
      }

      // Step 5: Check if there are any locations without errors
      if (validLocations.length === 0) {
        return res.status(400).json({
          message: "No valid locations to create.",
          errors: errorMessages,
        });
      }

      // Step 6: Generate custom IDs for valid locations
      const validLocationsWithCustomIds = await Promise.all(
        validLocations.map(async (location) => {
          if (location.customId) {
            return location;
          }

          const customId = await this.generateCustomId(location.province);
          return {
            ...location,
            customId,
          };
        })
      );

      // Step 7: Save valid locations to database (insertMany handles bulk insert)
      try {
        const createdLocations = await LocationModel.insertMany(
          validLocationsWithCustomIds
        );
        return res.status(201).json({
          message: "Locations created successfully.",
          data: createdLocations,
          errors: errorMessages.length > 0 ? errorMessages : null,
        });
      } catch (error: unknown) {
        console.error("Error saving locations:", error);
        return res.status(500).json({
          message: "Error saving locations to the database.",
          error:
            error instanceof Error ? error.message : "Error saving locations",
        });
      }
    } catch (error: unknown) {
      // Type guard to check if the error is an instance of Error
      if (error instanceof Error) {
        console.error("Unexpected error in bulkCreateLocations:", error);
        return res.status(500).json({
          message: "An unexpected error occurred.",
          error: error.message, // Safely access error.message
        });
      } else {
        // Handle cases where the error is not an instance of Error (if necessary)
        console.error("Unexpected non-error object:", error);
        return res.status(500).json({
          message: "An unexpected error occurred.",
          error: "An unknown error occurred.", // Fallback message
        });
      }
    }
  }

  // Utility to check for duplicate locationManager name-code pairs
  // Utility to generate custom ID
  private async generateCustomId(province: string): Promise<string> {
    try {
      const provinceKey = province.toUpperCase();
      const counter = await LocationCounterModel.findOneAndUpdate(
        { provinceKey },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true }
      );

      if (!counter) {
        throw new Error(
          `Failed to update counter for province: ${provinceKey}`
        );
      }

      const sequenceNumber = counter.sequenceValue.toString().padStart(5, "0");
      return `MG-${provinceKey}-${sequenceNumber}`;
    } catch (error) {
      console.error("Error generating customId:", error);
      throw error;
    }
  }
}

export default LocationService;

# ----- End of src/services/location.ts -----


# ----- Start of src/services/locationManager.ts -----

import { Request, Response } from "express";
import LocationManagerRepository from "../database/repositories/locationManager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class LocationManagerService {
  private locationManagerRepository: LocationManagerRepository;

  constructor() {
    this.locationManagerRepository = new LocationManagerRepository();
  }

  public async getLocationManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locationManagers = await this.locationManagerRepository.getLocationManagers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(locationManagers, "LocationManagers retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-getLocationManagers");
      res.sendError(error, "LocationManagers retrieval failed");
    }
  }

  public async getLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationManager = await this.locationManagerRepository.getLocationManagerById(req, id);
      res.sendFormatted(locationManager, "LocationManager retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-getLocationManager");
      res.sendError(error, "LocationManager retrieval failed");
    }
  }

  public async createLocationManager(req: Request, res: Response) {
    try {
      const locationManagerData = req.body;
      const newLocationManager = await this.locationManagerRepository.createLocationManager(req, locationManagerData);
      res.sendFormatted(newLocationManager, "LocationManager created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationManagerService-createLocationManager");
      res.sendError(error, "LocationManager creation failed");
    }
  }

  public async updateLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationManagerData = req.body;
      const updatedLocationManager = await this.locationManagerRepository.updateLocationManager(
        req,
        id,
        locationManagerData
      );
      res.sendFormatted(updatedLocationManager, "LocationManager updated successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-updateLocationManager");
      res.sendError(error, "LocationManager update failed");
    }
  }

  public async deleteLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationManager = await this.locationManagerRepository.deleteLocationManager(req, id);
      res.sendFormatted(deletedLocationManager, "LocationManager deleted successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-deleteLocationManager");
      res.sendError(error, "LocationManager deletion failed");
    }
  }
}

export default LocationManagerService;


# ----- End of src/services/locationManager.ts -----


# ----- Start of src/services/locationType.ts -----

// src/services/locationType.ts

import { Request, Response } from "express";
import LocationTypeRepository from "../database/repositories/locationType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class LocationTypeService {
  private locationTypeRepository: LocationTypeRepository;

  constructor() {
    this.locationTypeRepository = new LocationTypeRepository();
  }

  public async getLocationTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locationTypes = await this.locationTypeRepository.getLocationTypes(
        req,
        pagination,
        search
      );

      res.sendArrayFormatted(
        locationTypes,
        "Location types retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationTypes");
      res.sendError(error, "Location types retrieval failed", 500);
    }
  }

  public async getLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationType =
        await this.locationTypeRepository.getLocationTypeById(req, id);

      if (!locationType) {
        res.sendError(
          "Location type not found",
          "Location type retrieval failed",
          404
        );
        return;
      }

      res.sendFormatted(
        locationType,
        "Location type retrieved successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationType");
      res.sendError(error, "Location type retrieval failed", 500);
    }
  }

  public async createLocationType(req: Request, res: Response) {
    try {
      const locationTypeData = req.body;

      const newLocationType =
        await this.locationTypeRepository.createLocationType(
          req,
          locationTypeData
        );

      res.sendFormatted(
        newLocationType,
        "Location type created successfully",
        201
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-createLocationType");
      res.sendError(error, "Location type creation failed", 500);
    }
  }

  public async updateLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationTypeData = req.body;

      const updatedLocationType =
        await this.locationTypeRepository.updateLocationType(
          req,
          id,
          locationTypeData
        );

      if (!updatedLocationType) {
        res.sendError(
          "Location type not found or no changes made",
          "Location type update failed",
          404
        );
        return;
      }

      res.sendFormatted(
        updatedLocationType,
        "Location type updated successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-updateLocationType");
      res.sendError(error, "Location type update failed", 500);
    }
  }

  public async deleteLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationType =
        await this.locationTypeRepository.deleteLocationType(req, id);

      if (!deletedLocationType) {
        res.sendError(
          "Location type not found or already deleted",
          "Location type deletion failed",
          404
        );
        return;
      }

      res.sendFormatted(
        deletedLocationType,
        "Location type deleted successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-deleteLocationType");
      res.sendError(error, "Location type deletion failed", 500);
    }
  }
}

export default LocationTypeService;

# ----- End of src/services/locationType.ts -----


# ----- Start of src/services/manager.ts -----

// src/services/manager.ts

import { Request, Response } from "express";
import ManagerRepository from "../database/repositories/manager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ManagerService {
  private managerRepository: ManagerRepository;

  constructor() {
    this.managerRepository = new ManagerRepository();
  }

  public async getManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const managers = await this.managerRepository.getManagers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(managers, "Managers retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-getManagers");
      res.sendError(error, "Managers retrieval failed", 500);
    }
  }

  public async getManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const manager = await this.managerRepository.getManagerById(req, id);

      if (!manager) {
        res.sendError("Manager not found", "Manager retrieval failed", 404);
        return;
      }

      res.sendFormatted(manager, "Manager retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-getManager");
      res.sendError(error, "Manager retrieval failed", 500);
    }
  }

  public async createManager(req: Request, res: Response) {
    try {
      const managerData = req.body;
      console.log(req.body);

      // Integrate fileId and fileURL received from another API
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        managerData.fileId = fileId;
        managerData.fileURL = fileURL;
      } else {
        res.sendError(
          "fileId and fileURL must be provided",
          "Invalid input data",
          400
        );
        return;
      }

      const newManager = await this.managerRepository.createManager(
        req,
        managerData
      );

      res.sendFormatted(newManager, "Manager created successfully", 201);
    } catch (error) {
      await logError(error, req, "ManagerService-createManager");
      res.sendError(error, "Manager creation failed", 500);
    }
  }

  public async updateManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const managerData = req.body;

      // Integrate fileId and fileURL received from another API, if provided
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        managerData.fileId = fileId;
        managerData.fileURL = fileURL;
      }

      const updatedManager = await this.managerRepository.updateManager(
        req,
        id,
        managerData
      );

      if (!updatedManager) {
        res.sendError(
          "Manager not found or no changes made",
          "Manager update failed",
          404
        );
        return;
      }

      res.sendFormatted(updatedManager, "Manager updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-updateManager");
      res.sendError(error, "Manager update failed", 500);
    }
  }

  public async deleteManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedManager = await this.managerRepository.deleteManager(
        req,
        id
      );

      if (!deletedManager) {
        res.sendError(
          "Manager not found or already deleted",
          "Manager deletion failed",
          404
        );
        return;
      }

      res.sendFormatted(deletedManager, "Manager deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-deleteManager");
      res.sendError(error, "Manager deletion failed", 500);
    }
  }
}

export default ManagerService;

# ----- End of src/services/manager.ts -----


# ----- Start of src/services/project.ts -----

import { Request, Response } from "express";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { logError } from "../utils/errorLogger";
import ProjectRepository from "../database/repositories/project";
import { ProjectStatusModel } from "../database/models/projectStatus";
import { buildProjectQuery } from "../utils/buildProjectQuery";
import { LocationModel } from "../database/models/location";
import { CustomerModel } from "../database/models/customer";
import { ProjectManagerModel } from "../database/models/projectManager";
import { ProjectTypeModel } from "../database/models/projectType";
import mongoose from "mongoose";

class ProjectService {
  private projectRepository = new ProjectRepository();

  public async getProjectCountByStatus(req: Request, res: Response) {
    try {
      // Build the role-based query with filters
      const roleBasedQuery = await buildProjectQuery(req);

      // Apply additional filters from the request
      if (req.query.location) roleBasedQuery.location = req.query.location;
      if (req.query.customer) roleBasedQuery.customer = req.query.customer;

      console.log(roleBasedQuery);
      // Get project count by status from the repository
      const projectCount = await this.projectRepository.getProjectCountByStatus(
        req,
        roleBasedQuery
      );

      res.sendFormatted(
        projectCount,
        "Project count by status retrieved successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "ProjectService-getProjectCountByStatus");
      res.sendError(error, "Failed to retrieve project count by status", 500);
    }
  }

  /**
   * Get all projects with pagination and search.
   */
  public async getProjects(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);

      // Build the role-based query
      const roleBasedQuery = await buildProjectQuery(req);

      // Add search and additional filters
      if (search) roleBasedQuery.title = { $regex: search, $options: "i" };
      if (req.query.status) roleBasedQuery.status = req.query.status;
      if (req.query.location) roleBasedQuery.location = req.query.location;

      // Pass the status to the repository function
      const projects = await this.projectRepository.getProjects(
        req,
        pagination,
        roleBasedQuery
      );

      res.sendFormatted(projects, "Projects retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-getProjects");
      res.sendError(error, "Failed to retrieve projects", 500);
    }
  }

  /**
   * Get a specific project by ID.
   */
  public async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Build role-based query
      const roleBasedQuery = await buildProjectQuery(req);
      roleBasedQuery._id = id; // Include the specific project ID

      const project = await this.projectRepository.getProject(
        req,
        roleBasedQuery
      );
      if (!project) {
        res.sendError(null, "Project not found or not authorized", 404);
        return;
      }

      res.json(project);
    } catch (error) {
      await logError(error, req, "ProjectService-getProject");
      res.sendError(error, "Failed to retrieve project", 500);
    }
  }

  /**
   * Create a new project with an initial status of "Created".
   */
  public async createProject(req: Request, res: Response) {
    try {
      const projectData = req.body;

      // Fetch the "Created" status ID
      const createdStatus = await ProjectStatusModel.findOne({
        name: "Open",
      });
      if (!createdStatus) {
        res.sendError(null, "Initial status 'Created' not found", 400);
        return;
      }

      // Attach the "Created" status to the new project
      projectData.status = createdStatus._id;

      // Create the project
      const newProject = await this.projectRepository.createProject(
        req,
        projectData
      );

      res.sendFormatted(newProject, "Project created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectService-createProject");
      res.sendError(error, "Project creation failed", 500);
    }
  }

  /**
   * Update an existing project's data and handle status updates.
   */
  public async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectData = req.body;

      // Update the project data
      const updatedProject = await this.projectRepository.updateProject(
        req,
        id,
        projectData
      );

      // Handle special statuses if `status` is included in the payload
      if (projectData.status) {
        const specialStatuses = ["Suspended", "Blocked", "Closed"];
        const statusDetails = await ProjectStatusModel.findById(
          projectData.status
        );

        if (!statusDetails) {
          res.sendError(null, "Invalid status", 400);
          return;
        }

        if (specialStatuses.includes(statusDetails.name)) {
          // Additional logic can be added here for special status handling if required
          console.log(
            `Project ${id} updated to special status: ${statusDetails.name}`
          );
        }

        // Update the status of the project
        await this.projectRepository.updateProjectStatus(
          req,
          id,
          projectData.status
        );
      }

      res.sendFormatted(updatedProject, "Project updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-updateProject");
      res.sendError(error, "Project update failed", 500);
    }
  }

  /**
   * Delete a project by ID.
   */
  public async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProject = await this.projectRepository.deleteProject(
        req,
        id
      );
      res.sendFormatted(deletedProject, "Project deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ProjectService-deleteProject");
      res.sendError(error, "Project deletion failed", 500);
    }
  }

  public async bulkCreateProjects(req: Request, res: Response) {
    try {
      const projects = req.body;

      if (!Array.isArray(projects) || projects.length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid or empty projects array" });
      }

      const createdStatus = await ProjectStatusModel.findOne({ name: "Open" });
      if (!createdStatus?._id) {
        return res
          .status(400)
          .json({ message: "Default status 'Open' not found" });
      }
      const defaultStatusId = createdStatus._id;

      const invalidRows: any[] = [];
      const validProjects: any[] = [];

      for (const [index, project] of projects.entries()) {
        const errors: string[] = [];

        // Validate references in the database
        const location = await LocationModel.findOne({
          customId: project.location,
        });
        const customer = await CustomerModel.findOne({
          name: project.customer,
        });
        const projectManager = await ProjectManagerModel.findOne({
          email: project.projectManager,
        });
        const projectType = await ProjectTypeModel.findOne({
          name: project.type,
        });

        if (!location) errors.push("Invalid location reference.");
        if (!customer) errors.push("Invalid customer reference.");
        if (!projectManager) errors.push("Invalid project manager reference.");
        if (!projectType) errors.push("Invalid project type reference.");

        // Validate dates
        if (!this.isValidDate(project.assignmentDate))
          errors.push("Invalid assignment date format.");
        if (!this.isValidDate(project.schedaRadioDate))
          errors.push("Invalid scheda radio date format.");

        if (errors.length > 0) {
          invalidRows.push({ row: index + 1, issues: errors });
          continue; // Skip the invalid row
        }

        // Transform and add the valid project to the array
        validProjects.push({
          ...project,
          location: location?._id,
          customer: customer?._id,
          projectManager: projectManager?._id,
          type: projectType?._id,
          status: project.status || defaultStatusId,
          isActive: project.isActive ?? true,
          isDeleted: project.isDeleted ?? false,
          assignmentDate: new Date(project.assignmentDate).toISOString(),
          schedaRadioDate: new Date(project.schedaRadioDate).toISOString(),
        });
      }

      // If there are invalid rows, return an error response
      if (invalidRows.length > 0) {
        return res.status(400).json({
          message: "Bulk upload failed. Invalid rows found.",
          invalidRows, // Send row details with error messages
        });
      }

      // Bulk insert valid projects into the database
      const results = await this.projectRepository.bulkInsertProjects(
        req,
        validProjects
      );
      res.sendFormatted(results, "Bulk upload completed successfully", 201);
    } catch (error) {
      // Log the error and send a formatted response
      await logError(error, req, "ProjectService-bulkCreateProjects");
      res.sendError(error, "Bulk upload failed", 500);
    }
  }

  // Helper method to validate date
  private isValidDate(date: string): boolean {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }
}

export default ProjectService;

# ----- End of src/services/project.ts -----


# ----- Start of src/services/ProjectManager.ts -----

// src/services/projectManager.ts

import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import ProjectManagerRepository from "../database/repositories/projectManager";
import { hashPassword } from "../utils/passwordUtils";

class ProjectManagerService {
  private projectManagerRepository: ProjectManagerRepository;

  constructor() {
    this.projectManagerRepository = new ProjectManagerRepository();
  }

  public async getProjectManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectManagers =
        await this.projectManagerRepository.getProjectManagers(
          req,
          pagination,
          search
        );
      res.sendArrayFormatted(
        projectManagers,
        "Customers retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "ProjectManagerService-getProjectManagers");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async getProjectManagerById(req: Request, res: Response) {
    try {
      const projectManager =
        await this.projectManagerRepository.getProjectManagerById(
          req,
          req.params.id
        );
      res.json(projectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-getProjectManagerById");
      res.status(404).json({ error: error });
    }
  }

  public async createProjectManager(req: Request, res: Response) {
    try {
      // Hash password
      req.body.password = await hashPassword(req.body.password);
      const newProjectManager =
        await this.projectManagerRepository.createProjectManager(req, req.body);
      res.status(201).json(newProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-createProjectManager");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async updateProjectManager(req: Request, res: Response) {
    try {
      if (req.body.password) {
        req.body.password = await hashPassword(req.body.password);
      }

      const updatedProjectManager =
        await this.projectManagerRepository.updateProjectManager(
          req,
          req.params.id,
          req.body
        );
      res.json(updatedProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-updateProjectManager");
      res.status(404).json({ error: error });
    }
  }

  public async deleteProjectManager(req: Request, res: Response) {
    try {
      const deletedProjectManager =
        await this.projectManagerRepository.deleteProjectManager(
          req,
          req.params.id
        );
      res.json(deletedProjectManager);
    } catch (error) {
      await logError(error, req, "ProjectManagerService-deleteProjectManager");
      res.status(404).json({ error: error });
    }
  }
}

export default ProjectManagerService;

# ----- End of src/services/ProjectManager.ts -----


# ----- Start of src/services/projectStatus.ts -----

import { Request, Response } from "express";
import ProjectStatusRepository from "../database/repositories/projectStatus";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectStatusService {
  private projectStatusRepository: ProjectStatusRepository;

  constructor() {
    this.projectStatusRepository = new ProjectStatusRepository();
  }

  public async getProjectStatuses(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectStatuses = await this.projectStatusRepository.getProjectStatuses(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(projectStatuses, "Project statuses retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-getProjectStatuses");
      res.sendError(error, "Project statuses retrieval failed");
    }
  }

  public async getProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectStatus = await this.projectStatusRepository.getProjectStatusById(req, id);
      res.sendFormatted(projectStatus, "Project status retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-getProjectStatus");
      res.sendError(error, "Project status retrieval failed");
    }
  }

  public async createProjectStatus(req: Request, res: Response) {
    try {
      const projectStatusData = req.body;
      const newProjectStatus = await this.projectStatusRepository.createProjectStatus(req, projectStatusData);
      res.sendFormatted(newProjectStatus, "Project status created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectStatusService-createProjectStatus");
      res.sendError(error, "Project status creation failed");
    }
  }

  public async updateProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectStatusData = req.body;
      const updatedProjectStatus = await this.projectStatusRepository.updateProjectStatus(
        req,
        id,
        projectStatusData
      );
      res.sendFormatted(updatedProjectStatus, "Project status updated successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-updateProjectStatus");
      res.sendError(error, "Project status update failed");
    }
  }

  public async deleteProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProjectStatus = await this.projectStatusRepository.deleteProjectStatus(req, id);
      res.sendFormatted(deletedProjectStatus, "Project status deleted successfully");
    } catch (error) {
      await logError(error, req, "ProjectStatusService-deleteProjectStatus");
      res.sendError(error, "Project status deletion failed");
    }
  }
}

export default ProjectStatusService;

# ----- End of src/services/projectStatus.ts -----


# ----- Start of src/services/projectType.ts -----

import { Request, Response } from "express";
import ProjectTypeRepository from "../database/repositories/projectType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ProjectTypeService {
  private projectTypeRepository: ProjectTypeRepository;

  constructor() {
    this.projectTypeRepository = new ProjectTypeRepository();
  }

  public async getProjectTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const projectTypes = await this.projectTypeRepository.getProjectTypes(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(projectTypes, "ProjectTypes retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-getProjectTypes");
      res.sendError(error, "ProjectTypes retrieval failed");
    }
  }

  public async getProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectType = await this.projectTypeRepository.getProjectTypeById(req, id);
      res.sendFormatted(projectType, "ProjectType retrieved successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-getProjectType");
      res.sendError(error, "ProjectType retrieval failed");
    }
  }

  public async createProjectType(req: Request, res: Response) {
    try {
      const projectTypeData = req.body;
      const newProjectType = await this.projectTypeRepository.createProjectType(req, projectTypeData);
      res.sendFormatted(newProjectType, "ProjectType created successfully", 201);
    } catch (error) {
      await logError(error, req, "ProjectTypeService-createProjectType");
      res.sendError(error, "ProjectType creation failed");
    }
  }

  public async updateProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectTypeData = req.body;
      const updatedProjectType = await this.projectTypeRepository.updateProjectType(
        req,
        id,
        projectTypeData
      );
      res.sendFormatted(updatedProjectType, "ProjectType updated successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-updateProjectType");
      res.sendError(error, "ProjectType update failed");
    }
  }

  public async deleteProjectType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProjectType = await this.projectTypeRepository.deleteProjectType(req, id);
      res.sendFormatted(deletedProjectType, "ProjectType deleted successfully");
    } catch (error) {
      await logError(error, req, "ProjectTypeService-deleteProjectType");
      res.sendError(error, "ProjectType deletion failed");
    }
  }
}

export default ProjectTypeService;

# ----- End of src/services/projectType.ts -----


# ----- Start of src/services/serviceCompany.ts -----

import { Request, Response } from 'express';
import ServiceCompanyRepository from '../database/repositories/serviceCompany';
import { logError } from '../utils/errorLogger';
import { paginationHandler } from '../utils/paginationHandler';
import { searchHandler } from '../utils/searchHandler';

class ServiceCompanyService {
  private serviceCompanyRepository: ServiceCompanyRepository;

  constructor() {
    this.serviceCompanyRepository = new ServiceCompanyRepository();
  }

  public async getServiceCompanies(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const serviceCompanies = await this.serviceCompanyRepository.getServiceCompanies(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(serviceCompanies, 'ServiceCompanies retrieved successfully');
    } catch (error) {
      await logError(error, req, 'ServiceCompanyService-getServiceCompanies');
      res.sendError(error, 'ServiceCompanies retrieval failed');
    }
  }

  public async getServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const serviceCompany = await this.serviceCompanyRepository.getServiceCompanyById(req, id);
      res.sendFormatted(serviceCompany, 'ServiceCompany retrieved successfully');
    } catch (error) {
      await logError(error, req, 'ServiceCompanyService-getServiceCompany');
      res.sendError(error, 'ServiceCompany retrieval failed');
    }
  }

  public async createServiceCompany(req: Request, res: Response) {
    try {
      const serviceCompanyData = req.body;
      const newServiceCompany = await this.serviceCompanyRepository.createServiceCompany(req, serviceCompanyData);
      res.sendFormatted(newServiceCompany, 'ServiceCompany created successfully', 201);
    } catch (error) {
      await logError(error, req, 'ServiceCompanyService-createServiceCompany');
      res.sendError(error, 'ServiceCompany creation failed');
    }
  }

  public async updateServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const serviceCompanyData = req.body;
      const updatedServiceCompany = await this.serviceCompanyRepository.updateServiceCompany(
        req,
        id,
        serviceCompanyData
      );
      res.sendFormatted(updatedServiceCompany, 'ServiceCompany updated successfully');
    } catch (error) {
      await logError(error, req, 'ServiceCompanyService-updateServiceCompany');
      res.sendError(error, 'ServiceCompany update failed');
    }
  }

  public async deleteServiceCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedServiceCompany = await this.serviceCompanyRepository.deleteServiceCompany(req, id);
      res.sendFormatted(deletedServiceCompany, 'ServiceCompany deleted successfully');
    } catch (error) {
      await logError(error, req, 'ServiceCompanyService-deleteServiceCompany');
      res.sendError(error, 'ServiceCompany deletion failed');
    }
  }
}

export default ServiceCompanyService;


# ----- End of src/services/serviceCompany.ts -----


# ----- Start of src/services/timeSheet.ts -----

import { Request, Response } from "express";
import TimesheetRepository from "../database/repositories/timesheet";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { ITimesheet } from "@interfaces/timesheet";

class TimeSheetService {
  private timeSheetRepository: TimesheetRepository;

  constructor() {
    this.timeSheetRepository = new TimesheetRepository();
  }

  public async getTimesheetsByUser(req: Request, res: Response) {
    try {
      const tokenData = req.user as any; // Assert type of req.user
      if (!tokenData || !tokenData.role || !tokenData.id) {
        throw new Error("Invalid token data");
      }
      const { isMode } = req.query;

      const { id, role } = tokenData;
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const filters: Record<string, any> = {};
      console.log("id");
      console.log(id);
      console.log("role");
      console.log(role);
      // Dynamic status-based filtering using `isMode`
      if (isMode && typeof isMode === "string") {
        filters[isMode] = true; // Example: { isPending: true }
      }

      const timesheets = await this.timeSheetRepository.getTimesheetsByUser(
        req,
        id,
        role,
        pagination,
        search,
        filters
      );

      res.sendArrayFormatted(
        timesheets,
        "Filtered timesheets retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "TimeSheetService-getTimesheetsByUser");
      res.sendError(error, "Failed to retrieve filtered timesheets");
    }
  }

  public async getTimeSheets(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const { activityId, isMode } = req.query;

      const tokenData = req.user as any;
      if (!tokenData || !tokenData.role || !tokenData.id) {
        throw new Error("Invalid token data");
      }

      const filters: Record<string, any> = {};

      // Optional activity filter
      if (activityId) {
        filters.activity = activityId;
      }

      // Dynamic status-based filtering using `isMode`
      if (isMode && typeof isMode === "string") {
        filters[isMode] = true; // Example: { isPending: true }
      }

      const timeSheets = await this.timeSheetRepository.getTimeSheets(
        req,
        pagination,
        search,
        filters
      );

      res.sendArrayFormatted(timeSheets, "TimeSheets retrieved successfully");
    } catch (error) {
      await logError(error, req, "TimeSheetService-getTimeSheets");
      res.sendError(error, "TimeSheets retrieval failed");
    }
  }

  public async getTimeSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const timeSheets = await this.timeSheetRepository.getTimeSheetById(
        req,
        id
      );
      res.sendFormatted(timeSheets, "TimeSheet retrieved successfully");
    } catch (error) {
      await logError(error, req, "TimeSheetService-getTimesheet");
      res.sendError(error, "TimeSheet retrieval failed");
    }
  }

  public async createTimeSheet(req: Request, res: Response) {
    try {
      const tokenData = req.user as any; // Assert type of req.user
      if (!tokenData || !tokenData.role || !tokenData.id) {
        throw new Error("Invalid token data");
      }

      const { id, role } = tokenData;

      const timeSheetData: Partial<ITimesheet> = req.body;

      // Automatically add createdBy and createdByRole
      timeSheetData.createdBy = id; // Add user ID from token
      timeSheetData.createdByRole = role; // Add user role from token

      // Validate required fields
      const { date, startTime, endTime } = timeSheetData;
      if (!date || !startTime || !endTime) {
        throw new Error("Date, startTime, and endTime are required.");
      }

      // Helper function to create a Date object from the date and time components
      const createDateFromComponents = (baseDate: string, time: any): Date => {
        const date = new Date(baseDate); // Use the base date
        date.setHours(time.hour, time.minute, time.second, time.millisecond);
        return date;
      };

      // Ensure `date` is a string before passing it to `createDateFromComponents`
      const baseDateString =
        typeof date === "string" ? date : date.toISOString();

      // Transform startTime and endTime
      const transformedStartTime = createDateFromComponents(
        baseDateString,
        startTime
      );
      const transformedEndTime = createDateFromComponents(
        baseDateString,
        endTime
      );

      // Replace the original startTime and endTime with transformed values
      timeSheetData.startTime = transformedStartTime;
      timeSheetData.endTime = transformedEndTime;

      // Call the repository method to create a new timesheet
      const newTimeSheet = await this.timeSheetRepository.createTimeSheet(
        req,
        timeSheetData
      );

      res.sendFormatted(newTimeSheet, "TimeSheet created successfully", 201);
    } catch (error) {
      await logError(error, req, "TimeSheetService-createTimeSheet");
      res.sendError(error, "TimeSheet creation failed");
    }
  }

  public async updateTimeSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate that 'status' is present in the payload
      if (!status || typeof status !== "string") {
        throw new Error("Invalid status value provided.");
      }

      // Define the valid status fields
      const validStatuses = [
        "isPending",
        "isAccepted",
        "isRejected",
        "isResubmitted",
      ];

      // Check if the provided status is valid
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status. Allowed statuses are: ${validStatuses.join(", ")}`
        );
      }

      // Create an object to update only the specified status
      const updateData: Record<string, boolean> = {};
      validStatuses.forEach((key) => {
        updateData[key] = key === status; // Only the specified status is set to true
      });

      // Update the timesheet with the new status
      const updatedTimeSheet = await this.timeSheetRepository.updateTimeSheet(
        req,
        id,
        updateData
      );

      res.sendFormatted(
        updatedTimeSheet,
        "TimeSheet status updated successfully"
      );
    } catch (error) {
      await logError(error, req, "TimeSheetService-updateTimeSheet");
      res.sendError(error, "TimeSheet status update failed");
    }
  }

  public async deleteTimeSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedTimeSheet = await this.timeSheetRepository.deleteTimeSheet(
        req,
        id
      );
      res.sendFormatted(deletedTimeSheet, "TimeSheet deleted successfully");
    } catch (error) {
      await logError(error, req, "TimeSheetService-deleteTimeSheet");
      res.sendError(error, "TimeSheet deletion failed");
    }
  }
}

export default TimeSheetService;

# ----- End of src/services/timeSheet.ts -----


# ----- Start of src/services/worker.ts -----

import { Request, Response } from "express";
import WorkerRepository from "../database/repositories/worker";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { hashPassword } from "../utils/passwordUtils";

class WorkerService {
  private workerRepository: WorkerRepository;

  constructor() {
    this.workerRepository = new WorkerRepository();
  }

  public async getWorkers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const workers = await this.workerRepository.getWorkers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(workers, "Workers retrieved successfully");
    } catch (error) {
      await logError(error, req, "WorkerService-getWorkers");
      res.sendError(error, "Workers retrieval failed");
    }
  }

  public async getWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const worker = await this.workerRepository.getWorkerById(req, id);
      res.json(worker);
    } catch (error) {
      await logError(error, req, "WorkerService-getWorker");
      res.sendError(error, "Worker retrieval failed");
    }
  }

  public async createWorker(req: Request, res: Response) {
    try {
      const workerData = req.body;
      // Hash password
      workerData.password = await hashPassword(workerData.password);
      const newWorker = await this.workerRepository.createWorker(
        req,
        workerData
      );
      res.sendFormatted(newWorker, "Worker created successfully", 201);
    } catch (error) {
      await logError(error, req, "WorkerService-createWorker");
      res.sendError(error, "Worker creation failed");
    }
  }

  public async updateWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workerData = req.body;
      // Hash password
      if (workerData.password) {
        workerData.password = await hashPassword(workerData.password);
      }
      const updatedWorker = await this.workerRepository.updateWorker(
        req,
        id,
        workerData
      );
      res.json(updatedWorker);
    } catch (error) {
      await logError(error, req, "WorkerService-updateWorker");
      res.sendError(error, "Worker update failed");
    }
  }

  public async deleteWorker(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedWorker = await this.workerRepository.deleteWorker(req, id);
      res.sendFormatted(deletedWorker, "Worker deleted successfully");
    } catch (error) {
      await logError(error, req, "WorkerService-deleteWorker");
      res.sendError(error, "Worker deletion failed");
    }
  }
}

export default WorkerService;

# ----- End of src/services/worker.ts -----


# ----- Start of src/types/express/index.d.ts -----

import * as express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

# ----- End of src/types/express/index.d.ts -----


# ----- Start of src/types/express.d.ts -----

// src/types/express.d.ts

import { IAdminAuth } from "../middlewares/auth";
// src/@types/express/index.d.ts

declare global {
  namespace Express {
    interface Request {
      admin?: any;
    }
  }
}

# ----- End of src/types/express.d.ts -----


# ----- Start of src/types/userTypes.ts -----

// src/types/userTypes.ts

export interface IUser {
  id: string;
  email: string;
  role: UserRole;
}

export type UserRole =
  | "Admin"
  | "ActivityManager"
  | "Worker"
  | "User"
  | "ProjectManager";

# ----- End of src/types/userTypes.ts -----


# ----- Start of src/utils/apiLogger.ts -----

import winston from "winston";

// Define the log format
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Create a winston logger
const logger = winston.createLogger({
  level: "info", // Default log level
  format: winston.format.combine(
    winston.format.timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(), // Log to the console
    new winston.transports.File({ filename: "logs/api.log" }), // Log to a file
  ],
});

export default logger;

# ----- End of src/utils/apiLogger.ts -----


# ----- Start of src/utils/buildProjectQuery.ts -----

import { ActivityModel } from "../database/models/activity";
import { Request } from "express";

export const buildProjectQuery = async (req: Request): Promise<any> => {
  if (!req.user?.id && !req.user?.role) return;

  const userId = req.user.id; // Authenticated user ID
  const userRole = req.user.role; // User's role

  let query: any = { isDeleted: false };

  if (userRole === "Admin") {
    return query; // Admins can access all projects
  }

  if (userRole === "ProjectManager") {
    query.projectManager = userId; // Projects managed by the user
  } else if (userRole === "Customer") {
    query.customer = userId; // Projects associated with the customer
  } else if (userRole === "ActivityManager" || userRole === "Worker") {
    // Find activities linked to this role
    const activityQuery: any = {};

    if (userRole === "ActivityManager") {
      activityQuery.activityManager = userId;
    } else if (userRole === "Worker") {
      activityQuery.worker = userId;
    }

    const activities = await ActivityModel.find(activityQuery).select(
      "project"
    );
    const projectIds = activities.map((activity) => activity.project);
    query._id = { $in: projectIds }; // Filter by project IDs
  }

  return query;
};

# ----- End of src/utils/buildProjectQuery.ts -----


# ----- Start of src/utils/customIdGenerator.ts -----

export function generateCustomId(location: { nation: string; city: string; region: string; province: string }): string {
  const { nation, city, region, province } = location;
  const customId = `${nation.slice(0, 2).toUpperCase()}${city.slice(0, 2).toUpperCase()}${region.slice(0, 2).toUpperCase()}${province.slice(0, 2).toUpperCase()}`;
  return customId;
}

# ----- End of src/utils/customIdGenerator.ts -----


# ----- Start of src/utils/errorHandler.ts -----

import { Request, Response, NextFunction } from "express";
import { logError } from "./errorLogger";

export const errorHandler = async (err: any, req: Request, res: Response) => {
  await logError(err, req, "errorHandler");

  const status = err.status || 500;
  const message =
    err.message || "Something went wrong, please try again later.";
  res.status(status).json({
    status,
    message,
  });
};




# ----- End of src/utils/errorHandler.ts -----


# ----- Start of src/utils/errorLogger.ts -----

import { Request } from "express";

export const logError = async (error: any, req: Request, context: string) => {
  console.error(`[${new Date().toISOString()}] [${context}]`, {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });
  // Optionally, integrate with a logging service like Winston or Loggly
};

# ----- End of src/utils/errorLogger.ts -----


# ----- Start of src/utils/logger.ts -----

// src/utils/logger.ts

import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ""
  }`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),
    new transports.File({ filename: "logs/app.log" }),
  ],
  exceptionHandlers: [new transports.File({ filename: "logs/exceptions.log" })],
  rejectionHandlers: [new transports.File({ filename: "logs/rejections.log" })],
});

export default logger;

# ----- End of src/utils/logger.ts -----


# ----- Start of src/utils/paginationHandler.ts -----

import { Request } from "express";

export interface IPagination {
  page: number;
  limit: number;
}

export const paginationHandler = (req: Request): IPagination => {
  let { page, limit } = req.query;

  let pageNumber = parseInt(page as string, 10);
  let limitNumber = parseInt(limit as string, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    pageNumber = 1;
  }

  if (isNaN(limitNumber) || limitNumber < 1) {
    limitNumber = 10;
  }

  return { page: pageNumber, limit: limitNumber };
};

# ----- End of src/utils/paginationHandler.ts -----


# ----- Start of src/utils/passwordUtils.ts -----

// src/utils/passwordUtils.ts

import bcrypt from "bcryptjs";

const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

# ----- End of src/utils/passwordUtils.ts -----


# ----- Start of src/utils/responseFormatter.ts -----

import { Request, Response, NextFunction } from "express";

interface ResponseFormat {
  success: boolean;
  data?: any;
  message?: string;
  error?: any;
}

export const formatResponse = (
  success: boolean,
  data: any = null,
  message: string = "",
  error: any = null
): ResponseFormat => {
  var data = { ...data };

  return {
    success,
    data,
    message,
    error,
  };
};
export const formatArrayResponse = (
  success: boolean,
  data: any = null,
  message: string = "",
  error: any = null
): ResponseFormat => {
  return {
    success,
    data,
    message,
    error,
  };
};
declare global {
  namespace Express {
    interface Response {
      sendFormatted: (data: any, message?: string, status?: number) => void;
      sendArrayFormatted: (
        data: any,
        message?: string,
        status?: number
      ) => void;
      sendError: (error: any, message?: string, status?: number) => void;
    }
  }
}

export const responseFormatter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.sendFormatted = (
    data: any,
    message: string = "",
    status: number = 200
  ) => {
    res.status(status).json(formatResponse(true, data, message));
  };
  res.sendArrayFormatted = (
    data: any,
    message: string = "",
    status: number = 200
  ) => {
    res.status(status).json(formatArrayResponse(true, data, message));
  };

  res.sendError = (error: any, message: string = "", status: number = 500) => {
    res.status(status).json(formatResponse(false, null, message, error));
  };

  next();
};

# ----- End of src/utils/responseFormatter.ts -----


# ----- Start of src/utils/searchHandler.ts -----

import { Request } from "express";

export const searchHandler = (req: Request): string => {
  const { search } = req.query;
  return search ? String(search) : "";
};

# ----- End of src/utils/searchHandler.ts -----


# ----- Start of src/utils/tokenUtils.ts -----

// src/utils/tokenUtils.ts

import { IAdmin } from "interfaces/admin";
import { ICustomer } from "interfaces/customer";
import { IManager } from "interfaces/manager";
import { IWorker } from "interfaces/worker";
import jwt from "jsonwebtoken";

// Define the payload interface
interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Generates a JWT token for a user.
 * @param user - The user object (Admin or Customer).
 * @returns The signed JWT token.
 */
export const generateJWTToken = (
  user: IAdmin | ICustomer | IWorker | IManager
): string => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "1h", // Token validity duration
  });

  return token;
};

# ----- End of src/utils/tokenUtils.ts -----


# ----- Start of src/utils/verifyToken.ts -----

// utils/verifyToken.ts
import jwt from "jsonwebtoken";

interface DecodedToken {
  id: string;
  email: string;
  role?: string;
  // Add other payload properties as needed
  iat: number;
  exp: number;
}

export const verifyToken = (token: string): DecodedToken | null => {
  try {
    const secretKey = process.env.JWT_SECRET_KEY as string;
    const decoded = jwt.verify(token, secretKey) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

# ----- End of src/utils/verifyToken.ts -----

