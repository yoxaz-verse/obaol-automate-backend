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
