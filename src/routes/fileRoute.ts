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
