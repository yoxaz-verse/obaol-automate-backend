import mongoose, { Schema } from "mongoose";
import { NotificationEntityType, NotificationType } from "../../constants/notificationTypes";

export interface INotification extends mongoose.Document {
  recipientUserId: mongoose.Types.ObjectId;
  recipientRole: string;
  type: NotificationType | string;
  title: string;
  message: string;
  entityType: NotificationEntityType | string;
  entityId: mongoose.Types.ObjectId | string;
  route: string;
  payload?: Record<string, any>;
  isRead: boolean;
  readAt?: Date | null;
  priority: "low" | "medium" | "high";
  createdByUserId?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    recipientRole: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed, required: true, index: true },
    route: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    createdByUserId: { type: Schema.Types.ObjectId, required: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientRole: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>("Notification", NotificationSchema);

