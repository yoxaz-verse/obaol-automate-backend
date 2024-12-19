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
