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
