import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";

dotenv.config();

async function run() {
  try {
    const uri = (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    const approveLegacyCompanies = String(process.env.APPROVE_LEGACY_COMPANIES || "true").toLowerCase() !== "false";

    const associatesResult = await AssociateModel.updateMany(
      {
        isDeleted: { $ne: true },
        $or: [
          { registrationStatus: { $exists: false } },
          { registrationStatus: null },
          { registrationStatus: "" },
          { registrationStatus: "PENDING_REVIEW" },
        ],
      },
      {
        $set: {
          registrationStatus: "APPROVED",
          isActive: true,
          isCompanyVerified: true,
        },
      }
    );

    const baseCompanyFilter: any = {
      isDeleted: { $ne: true },
      $or: [
        { registrationStatus: { $exists: false } },
        { registrationStatus: null },
        { registrationStatus: "" },
        { registrationStatus: "PENDING_REVIEW" },
      ],
    };
    const companyFilter = approveLegacyCompanies ? baseCompanyFilter : { ...baseCompanyFilter, _id: null };

    const companiesResult = await AssociateCompanyModel.updateMany(
      companyFilter,
      {
        $set: {
          registrationStatus: approveLegacyCompanies ? "APPROVED" : "PENDING_REVIEW",
          isApproved: approveLegacyCompanies,
          ...(approveLegacyCompanies ? { approvedAt: new Date() } : {}),
        },
      }
    );

    console.log(`Associates updated: ${associatesResult.modifiedCount}`);
    console.log(`Companies updated: ${companiesResult.modifiedCount}`);
    console.log(`approveLegacyCompanies: ${approveLegacyCompanies}`);
  } catch (error: any) {
    console.error("Failed to backfill approval status:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
