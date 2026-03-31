import dotenv from "dotenv";
import mongoose from "mongoose";
import { VariantRateModel } from "../database/models/variantRate";

dotenv.config();

const COMMISSION_RATE = 0.025;
const round2 = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

async function run() {
  try {
    const uri = (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    const cursor = VariantRateModel.find({ isDeleted: { $ne: true } }).select("_id rate").cursor();
    let updated = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const rateValue = Number((doc as any).rate || 0);
      if (!Number.isFinite(rateValue)) continue;
      const nextCommission = round2(rateValue * COMMISSION_RATE);
      await VariantRateModel.updateOne(
        { _id: (doc as any)._id },
        { $set: { commission: nextCommission } }
      );
      updated += 1;
    }

    console.log(`Variant rates updated: ${updated}`);
  } catch (error: any) {
    console.error("Failed to backfill variant rate commission:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
