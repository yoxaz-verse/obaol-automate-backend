// src/routes/fileRoutes.ts

import { Router } from "express";
import upload from "../middlewares/upload"; // Multer configuration
import authenticate from "../middlewares/auth";
import uploadLimiter from "../middlewares/rateLimiter";
import fileController from "../controllers/fileController";

const fileRouter = Router();

// Route: POST /api/v1/web/files/upload
fileRouter.post(
  "/",
  authenticate,
  uploadLimiter,
  upload.any(), // Accepts both single and multiple files
  fileController.upload
);

// Route: PUT /api/v1/web/files/:id
fileRouter.put(
  "/:id",
  authenticate,
  uploadLimiter,
  upload.single("file"), // Optional: Only if replacing the file
  fileController.update
);

// Route: DELETE /api/v1/web/files/:id
fileRouter.delete("/:id", authenticate, uploadLimiter, fileController.delete);

export default fileRouter;
