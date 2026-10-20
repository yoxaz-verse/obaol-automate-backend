import dotenv from "dotenv";
import mongoose from "mongoose";
import { SidebarGovernanceModel } from "../database/models/sidebarGovernance";
import { migrateUnassignedFallbacks } from "../utils/sidebarGovernanceRegistry";

dotenv.config();
const apply = process.argv.includes("--apply");

const plainMappings = (mappings: any[] = []) => mappings.map((row: any) => ({
  functionSlug: String(row.functionSlug),
  routePath: String(row.routePath),
  placement: String(row.placement),
  status: String(row.status),
  order: Number(row.order),
}));

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || "";
  if (!uri) throw new Error("Missing Mongo connection string.");
  await mongoose.connect(uri);
  try {
    const config: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" });
    if (!config) return console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", changed: false, converted: 0, message: "No sidebar governance configuration found." }, null, 2));
    const before = plainMappings(config.draft?.mappings || []);
    const after = migrateUnassignedFallbacks(before);
    const converted = after.filter((row, index) => row.placement === "UNASSIGNED" && before[index]?.placement !== "UNASSIGNED").length;
    if (!converted) return console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", changed: false, converted: 0, draftRevision: config.draft?.revision }, null, 2));
    if (!apply) return console.log(JSON.stringify({ mode: "dry-run", changed: true, converted, currentDraftRevision: config.draft?.revision, nextDraftRevision: Number(config.draft?.revision || 0) + 1 }, null, 2));
    config.draft.mappings = after;
    config.draft.revision = Number(config.draft?.revision || 0) + 1;
    config.draft.updatedAt = new Date();
    config.matrixMigrationVersion = Math.max(Number(config.matrixMigrationVersion || 0), 4);
    await config.save();
    console.log(JSON.stringify({ mode: "apply", changed: true, converted, draftRevision: config.draft.revision, publishedRevision: config.published?.revision }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Failed to migrate sidebar Unassigned mappings:", error);
  process.exitCode = 1;
});
