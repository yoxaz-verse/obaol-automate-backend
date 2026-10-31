import dotenv from "dotenv";
import mongoose from "mongoose";
import { CompanyCapabilityChangeRequestModel } from "../database/models/companyCapabilityChangeRequest";

dotenv.config();

async function run() {
  try {
    const uri = String(process.env.MONGODB_URI || "");
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    await CompanyCapabilityChangeRequestModel.updateMany(
      { legacyReportId: null },
      { $unset: { legacyReportId: "" } }
    );

    const latestDecisions = await CompanyCapabilityChangeRequestModel.aggregate([
      { $match: { status: { $in: ["APPROVED", "REJECTED"] }, reviewedAt: { $ne: null }, isDeleted: false } },
      { $sort: { reviewedAt: -1, createdAt: -1 } },
      { $group: { _id: "$companyId", decision: { $first: "$$ROOT" } } },
    ]);

    let repaired = 0;
    for (const row of latestDecisions) {
      const decision = row.decision;
      const result = await CompanyCapabilityChangeRequestModel.updateMany({
        companyId: row._id,
        status: "PENDING_REVIEW",
        isDeleted: false,
        createdAt: { $lte: decision.reviewedAt },
      }, { $set: {
        status: "REJECTED",
        reviewNotes: "Superseded by a newer completed capability decision.",
        reviewedBy: decision.reviewedBy || null,
        reviewedAt: decision.reviewedAt,
      } });
      repaired += result.modifiedCount;
    }

    console.log(JSON.stringify({ companiesChecked: latestDecisions.length, repaired }, null, 2));
  } catch (error: any) {
    console.error("Failed to repair superseded capability requests:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
