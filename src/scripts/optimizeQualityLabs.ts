import dotenv from "dotenv";
import mongoose from "mongoose";
import { LabProfileModel } from "../database/models/labProfile";
import { LabWorkItemModel } from "../database/models/labWorkItem";

dotenv.config();
const apply = process.argv.includes("--apply");

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || "";
  if (!uri) throw new Error("Missing Mongo connection string.");
  await mongoose.connect(uri);
  const report = { mode: apply ? "apply" : "dry-run", profilesScanned: 0, revisionsBackfilled: 0, emptyDraftsRemoved: 0, workItemsScanned: 0, workItemsLinked: 0, ambiguous: 0, issues: [] as Array<Record<string, unknown>> };
  try {
    const profiles: any[] = await LabProfileModel.find({}).select("companyId draft published revision status").lean();
    report.profilesScanned = profiles.length;
    for (const profile of profiles) {
      const empty = !profile.draft && !profile.published;
      if (empty) {
        const referenced = await LabWorkItemModel.exists({ labProfileId: profile._id });
        if (!referenced) { report.emptyDraftsRemoved += 1; if (apply) await LabProfileModel.deleteOne({ _id: profile._id, draft: null, published: null }); }
        continue;
      }
      if (!Number.isFinite(profile.revision) || profile.revision < 1) { report.revisionsBackfilled += 1; if (apply) await LabProfileModel.updateOne({ _id: profile._id }, { $set: { revision: 1 } }); }
    }
    const workItems: any[] = await LabWorkItemModel.find({ labProfileId: null }).select("_id labCompanyId").lean();
    report.workItemsScanned = workItems.length;
    for (const item of workItems) {
      const facilities = await LabProfileModel.find({ companyId: item.labCompanyId, status: "PUBLISHED", published: { $ne: null } }).select("_id").lean();
      if (facilities.length === 1) { report.workItemsLinked += 1; if (apply) await LabWorkItemModel.updateOne({ _id: item._id, labProfileId: null }, { $set: { labProfileId: facilities[0]._id } }); }
      else { report.ambiguous += 1; report.issues.push({ workItemId: String(item._id), companyId: String(item.labCompanyId), eligibleFacilityCount: facilities.length }); }
    }
    console.log(JSON.stringify(report, null, 2));
    if (report.ambiguous) process.exitCode = 2;
  } finally { await mongoose.disconnect(); }
}
run().catch((error) => { console.error("Quality Labs optimization failed:", error); process.exitCode = 1; });
