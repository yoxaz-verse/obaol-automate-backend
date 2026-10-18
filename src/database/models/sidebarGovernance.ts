import mongoose from "mongoose";

const MappingSchema = new mongoose.Schema({
  functionSlug: { type: String, required: true, trim: true, lowercase: true },
  routePath: { type: String, required: true, trim: true },
  placement: { type: String, enum: ["SEEKING", "PROVIDING", "BOTH", "OTHER_SERVICES"], required: true },
  status: { type: String, enum: ["LIVE", "COMING_SOON", "HIDDEN"], required: true },
  order: { type: Number, required: true, min: 0 },
}, { _id: false });

const SnapshotSchema = new mongoose.Schema({
  revision: { type: Number, required: true, default: 0 },
  resolutionVersion: { type: Number, enum: [1, 2], required: true, default: 1 },
  sectionOrder: {
    SEEKING: { type: [String], default: [] },
    PROVIDING: { type: [String], default: [] },
    OTHER_SERVICES: { type: [String], default: [] },
  },
  fallbackStatusByRoute: { type: Map, of: { type: String, enum: ["LIVE", "COMING_SOON", "HIDDEN"] }, default: {} },
  mappings: { type: [MappingSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { _id: false });

const SidebarGovernanceSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "associate-sidebar" },
  matrixMigrationVersion: { type: Number, required: true, default: 0 },
  draft: { type: SnapshotSchema, required: true },
  published: { type: SnapshotSchema, required: true },
}, { timestamps: true });

export const SidebarGovernanceModel = mongoose.model("SidebarGovernance", SidebarGovernanceSchema);
