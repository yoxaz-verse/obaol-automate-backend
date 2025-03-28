import mongoose from "mongoose";

export interface IStatusHistory extends mongoose.Document {
  entityId: mongoose.Types.ObjectId; // ID of the Location, Activity, or Project
  entityType: "Location" | "Activity" | "Project"; // Type of entity
  previousStatus?: string; // The status before change (optional for creation)
  newStatus?: string; // The new status after change
  changedFields?: { field: string; oldValue: any; newValue: any }[]; // Fields that changed
  changeType: string; // e.g., "Location Created", "Activity Updated"
  changedBy: mongoose.Types.ObjectId; // User who made the change (from any model)
  changedRole:
    | "Admin"
    | "ProjectManager"
    | "Associate"
    | "InventoryManager"
    | "Worker"
    | "Customer"; // Role of the user
  changedAt: Date; // Timestamp of the change
}

const StatusHistorySchema = new mongoose.Schema<IStatusHistory>(
  {
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityType: {
      type: String,
      enum: ["Location", "Activity", "Project"],
      required: true,
    },
    previousStatus: { type: String }, // Optional (not needed for creation)
    newStatus: { type: String },
    changedFields: [
      {
        field: { type: String, required: true },
        oldValue: { type: mongoose.Schema.Types.Mixed },
        newValue: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    changeType: { type: String, required: true }, // Now dynamic, e.g., "Location Updated"
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    changedRole: {
      type: String,
      enum: [
        "Admin",
        "ProjectManager",
        "ActivityManager",
        "Worker",
        "Customer",
        "Associate",
        "InventoryManager",
      ],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const StatusHistoryModel = mongoose.model<IStatusHistory>(
  "StatusHistory",
  StatusHistorySchema
);
