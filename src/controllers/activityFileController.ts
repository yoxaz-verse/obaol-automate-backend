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
