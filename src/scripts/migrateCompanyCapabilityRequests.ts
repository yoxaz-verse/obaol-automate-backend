import dotenv from "dotenv";
import mongoose from "mongoose";
import { CompanyCapabilityChangeRequestModel } from "../database/models/companyCapabilityChangeRequest";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { OrganizationReportModel } from "../database/models/organizationReport";
import { normalizeCompanyFunctionSlugs } from "../utils/companyCapabilities";

dotenv.config();

const statusMap: Record<string, "PENDING_REVIEW" | "APPROVED" | "REJECTED"> = {
  PENDING_REVIEW: "PENDING_REVIEW",
  UNDER_REVIEW: "PENDING_REVIEW",
  ACTION_TAKEN: "APPROVED",
  RESOLVED: "APPROVED",
  REJECTED: "REJECTED",
};

async function run() {
  try {
    const uri = String(process.env.MONGODB_URI || "");
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);
    const reports = await OrganizationReportModel.find({ reasonCode: "COMPANY_INTEREST_UPDATE", isDeleted: { $ne: true } }).lean();
    const functionRows = await CompanyFunctionModel.find({ isActive: true }).select("_id slug").lean();
    const idBySlug = new Map(functionRows.map((row: any) => [String(row.slug), String(row._id)]));
    let valid = 0;
    const malformed: string[] = [];

    for (const report of reports as any[]) {
      const payload = report.payload || {};
      let provided = (payload.requestedProvidedFunctionIds || payload.requestedCompanyFunctionIds || []).map(String);
      let sought = (payload.requestedSoughtFunctionIds || payload.requestedCompanyFunctionIds || []).map(String);
      if (!provided.length && Array.isArray(payload.requestedInterests)) {
        provided = normalizeCompanyFunctionSlugs(payload.requestedInterests).map((slug) => idBySlug.get(slug)).filter(Boolean) as string[];
        sought = [...provided];
      }
      const companyId = String(report.targetCompanyId || report.reporterCompanyId || "");
      const requesterId = String(payload.requestedBy || report.reporterAssociateId || "");
      if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(requesterId) || !provided.length || !sought.length) {
        malformed.push(String(report._id));
        continue;
      }
      valid += 1;
      await CompanyCapabilityChangeRequestModel.updateOne(
        { legacyReportId: report._id },
        { $setOnInsert: {
          requesterAssociateId: requesterId,
          companyId,
          requestedProvidedFunctionIds: provided,
          requestedSoughtFunctionIds: sought,
          requestedProvidedFunctionPriorities: (payload.requestedProvidedFunctionPriorities || payload.requestedCompanyFunctionPriorities || []).map(String),
          requestedSoughtFunctionPriorities: (payload.requestedSoughtFunctionPriorities || payload.requestedCompanyFunctionPriorities || []).map(String),
          note: String(payload.note || report.description || ""),
          status: statusMap[String(report.status || "PENDING_REVIEW")] || "PENDING_REVIEW",
          reviewNotes: String(report.adminNotes || ""),
          reviewedBy: report.reviewedBy || null,
          reviewedAt: report.reviewedAt || null,
          legacyReportId: report._id,
          isDeleted: false,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        } },
        { upsert: true, timestamps: false }
      );
    }

    const migrated = await CompanyCapabilityChangeRequestModel.countDocuments({ legacyReportId: { $in: reports.map((row: any) => row._id) } });
    if (migrated !== valid) throw new Error(`Migration verification failed: ${valid} valid source records, ${migrated} migrated records.`);
    console.log(JSON.stringify({ source: reports.length, migrated, malformed }, null, 2));
  } catch (error: any) {
    console.error("Failed to migrate company capability requests:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
