import mongoose, { Schema } from "mongoose";

const notificationCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    normalizedName: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "", trim: true, maxlength: 240 },
    isActive: { type: Boolean, default: true, index: true },
    archivedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    createdByRole: { type: String, required: true, enum: ["Admin", "CustomerSupport"] },
  },
  { timestamps: true }
);

notificationCategorySchema.pre("validate", function (next) {
  this.normalizedName = String(this.name || "").trim().toLowerCase();
  next();
});

export const NotificationCategoryModel = mongoose.model("NotificationCategory", notificationCategorySchema);
