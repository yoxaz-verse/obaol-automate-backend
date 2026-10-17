import dotenv from "dotenv";
import mongoose from "mongoose";
import { SidebarGovernanceModel } from "../database/models/sidebarGovernance";
import { migrateCommonRoutesFromSnapshot } from "../utils/sidebarCommonMigration";

dotenv.config();
const apply = process.argv.includes("--apply");

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || "";
  if (!uri) throw new Error("Missing Mongo connection string.");
  await mongoose.connect(uri);
  try {
    const config: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" });
    if (!config) return console.log("No sidebar governance configuration found.");
    const now = new Date();
    const draft = migrateCommonRoutesFromSnapshot(config.draft?.toObject?.() || config.draft, now);
    const published = migrateCommonRoutesFromSnapshot(config.published?.toObject?.() || config.published, now);
    if (!draft.changed && !published.changed) return console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", changed: false, message: "Sidebar common-route migration already applied." }, null, 2));
    if (!apply) return console.log(JSON.stringify({ mode: "dry-run", changed: true, draftChanged: draft.changed, publishedChanged: published.changed, draftRevision: draft.snapshot.revision, publishedRevision: published.snapshot.revision }, null, 2));
    if (draft.changed) config.draft = draft.snapshot;
    if (published.changed) config.published = published.snapshot;
    await config.save();
    console.log(JSON.stringify({ mode: "apply", changed: true, draftChanged: draft.changed, publishedChanged: published.changed, draftRevision: draft.snapshot.revision, publishedRevision: published.snapshot.revision }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Failed to migrate sidebar common routes:", error);
  process.exitCode = 1;
});
