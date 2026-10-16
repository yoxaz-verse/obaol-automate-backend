import dotenv from "dotenv";
import mongoose from "mongoose";
import { VariantRateModel } from "../database/models/variantRate";

dotenv.config();

export async function migrateVariantRateImmediatePublication(now = new Date()) {
  const approved = await VariantRateModel.updateMany(
    { approvalStatus: "PENDING_REVIEW" },
    {
      $set: {
        approvalStatus: "APPROVED",
        approvalRequestedAt: null,
        approvedAt: now,
        approvedBy: null,
        reviewNotes: "",
      },
    },
  );
  const rejected = await VariantRateModel.updateMany(
    { approvalStatus: "REJECTED", $or: [{ isLive: true }, { unpublishedAt: null }, { unpublishedAt: { $exists: false } }] },
    { $set: { isLive: false } },
  );
  await VariantRateModel.updateMany(
    { approvalStatus: "REJECTED", unpublishedAt: null },
    { $set: { unpublishedAt: now } },
  );
  await VariantRateModel.updateMany(
    { approvalStatus: "REJECTED", unpublishedAt: { $exists: false } },
    { $set: { unpublishedAt: now } },
  );
  return { approved: approved.modifiedCount, rejectedForcedOffline: rejected.modifiedCount };
}

async function run() {
  const uri = String(process.env.MONGODB_URI || process.env.MONGO_URI || "");
  if (!uri) throw new Error("MONGODB_URI is missing.");
  await mongoose.connect(uri);
  try {
    console.log(JSON.stringify(await migrateVariantRateImmediatePublication(), null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error("Variant-rate publication migration failed:", error?.message || error);
    process.exitCode = 1;
  });
}
