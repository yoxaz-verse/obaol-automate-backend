import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateReferralService } from "../services/associateReferral.service";

dotenv.config();

async function run() {
  try {
    const uri = (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);
    const companies = await AssociateCompanyModel.find({
      registrationStatus: "APPROVED",
      $or: [{ referralCode: null }, { referralCode: { $exists: false } }],
    }).select("_id").lean();
    for (const company of companies) await AssociateReferralService.ensureCompanyCode(company._id);
    console.log(`Associate company referral codes generated: ${companies.length}`);
  } catch (error: any) {
    console.error("Failed to backfill associate referral codes:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
