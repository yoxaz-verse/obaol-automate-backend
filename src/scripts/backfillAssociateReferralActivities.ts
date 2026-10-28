import "dotenv/config";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import {
  AssociateReferralActivityModel,
  REFERRAL_ACTIVITY_TYPES,
} from "../database/models/associateReferralActivity";

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI or MONGO_URI is required.");
  await mongoose.connect(uri);
  const companies: any[] = await AssociateCompanyModel.find({
    referredByCompanyId: { $ne: null },
    referralActivatedAt: { $ne: null },
    "referralActivationEvent.entityId": { $ne: null },
    "referralActivationEvent.type": { $in: REFERRAL_ACTIVITY_TYPES },
  }).select("_id referralActivatedAt referralActivationEvent").lean();

  if (companies.length) {
    await AssociateReferralActivityModel.bulkWrite(companies.map((company: any) => ({
      updateOne: {
        filter: {
          companyId: company._id,
          type: company.referralActivationEvent.type,
          sourceEntityId: company.referralActivationEvent.entityId,
        },
        update: { $setOnInsert: {
          companyId: company._id,
          type: company.referralActivationEvent.type,
          sourceEntityId: company.referralActivationEvent.entityId,
          occurredAt: company.referralActivatedAt,
        } },
        upsert: true,
      },
    })), { ordered: false });
  }
  console.log(`Backfilled ${companies.length} associate referral activity records.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
