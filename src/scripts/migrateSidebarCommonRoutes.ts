import dotenv from "dotenv";
import mongoose from "mongoose";
import { SidebarGovernanceModel } from "../database/models/sidebarGovernance";
import { migrateCommonRoutesFromSnapshot } from "../utils/sidebarCommonMigration";

dotenv.config();

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
    if (!draft.changed && !published.changed) return console.log("Sidebar common-route migration already applied.");
    if (draft.changed) config.draft = draft.snapshot;
    if (published.changed) config.published = published.snapshot;
    await config.save();
    console.log(`Sidebar common-route migration complete (draft: ${draft.changed}, published: ${published.changed}).`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Failed to migrate sidebar common routes:", error);
  process.exitCode = 1;
});
