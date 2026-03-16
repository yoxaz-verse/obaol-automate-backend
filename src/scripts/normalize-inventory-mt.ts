import dotenv from "dotenv";
import mongoose from "mongoose";
import { InventoryModel } from "../database/models/inventory";
import { VariantRateModel } from "../database/models/variantRate";

dotenv.config();

const toMt = (quantity: number, unit: string | undefined | null) => {
  const normalized = String(unit || "MT").toUpperCase();
  if (normalized === "KG") return quantity / 1000;
  if (normalized === "QUINTAL") return quantity / 10;
  return quantity;
};

async function run() {
  try {
    const uri = (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");

    await mongoose.connect(uri);

    const rows = await InventoryModel.find({
      isDeleted: { $ne: true },
      $or: [{ unit: { $ne: "MT" } }, { unit: { $exists: false } }],
    }).select("_id quantity unit linkedVariantRate");

    let updated = 0;
    for (const row of rows) {
      const currentQty = Number((row as any).quantity || 0);
      const newQty = toMt(currentQty, (row as any).unit);
      (row as any).quantity = newQty;
      (row as any).unit = "MT";
      await row.save();
      updated += 1;

      const linkedRateId = (row as any).linkedVariantRate;
      if (linkedRateId) {
        await VariantRateModel.findByIdAndUpdate(linkedRateId, {
          $set: { quantity: newQty, unit: "MT" },
        });
      }
    }

    console.log(`Inventories normalized to MT: ${updated}`);
  } catch (error: any) {
    console.error("Failed to normalize inventories:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
