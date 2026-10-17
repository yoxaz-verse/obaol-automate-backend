import dotenv from "dotenv";
import mongoose from "mongoose";
import { InquiryModel } from "../database/models/enquiry";
import { LabWorkItemModel } from "../database/models/labWorkItem";
import { scanAwardedLabWork } from "../utils/labWorkReconciliation";

dotenv.config();

const mode = process.argv.includes("--apply") ? "apply" : "dry-run";

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || "";
  if (!uri) throw new Error("Missing Mongo connection string.");
  await mongoose.connect(uri);
  const report = { mode, scanned: 0, candidates: 0, created: 0, skipped: 0, ambiguous: 0, failed: 0, issues: [] as any[] };
  try {
    const inquiries: any[] = await InquiryModel.find({ executionInquiries: { $elemMatch: { type: "QUALITY_TESTING", committedProvider: { $ne: null } } } })
      .select("_id createdBy updatedBy createdAt updatedAt executionInquiries")
      .lean();
    report.scanned = inquiries.length;
    const scan = scanAwardedLabWork(inquiries);
    report.candidates = scan.candidates.length;
    report.ambiguous = scan.ambiguous.length;
    report.issues.push(...scan.ambiguous);
    for (const candidate of scan.candidates) {
      const key = { inquiryId: candidate.inquiryId, executionTaskId: candidate.executionTaskId };
      if (await LabWorkItemModel.exists(key)) { report.skipped += 1; continue; }
      if (mode === "dry-run") { report.created += 1; continue; }
      try {
        await LabWorkItemModel.create({
          ...key,
          labCompanyId: candidate.labCompanyId,
          status: "EXPECTED",
          expectedAt: candidate.awardedAt,
          createdBy: candidate.actorId,
          updatedBy: candidate.actorId,
          statusHistory: [{ status: "EXPECTED", at: candidate.awardedAt, by: candidate.actorId, note: "Reconciled from an existing quality-testing award." }],
        });
        report.created += 1;
      } catch (error: any) {
        if (error?.code === 11000) report.skipped += 1;
        else { report.failed += 1; report.issues.push({ ...key, reason: error?.message || "Creation failed." }); }
      }
    }
    console.log(JSON.stringify(report, null, 2));
    if (report.failed || report.ambiguous) process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Failed to reconcile lab work items:", error);
  process.exitCode = 1;
});
