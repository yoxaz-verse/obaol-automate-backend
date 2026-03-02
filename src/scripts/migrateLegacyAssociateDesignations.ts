import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { DesignationModel } from "../database/models/designation";

dotenv.config();

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) {
      throw new Error("MONGODB_URI is missing.");
    }
    await mongoose.connect(uri);

    const designations = await DesignationModel.find({ isDeleted: { $ne: true } }, { _id: 1, name: 1 }).lean();
    const designationMap = new Map<string, string>();
    for (const d of designations) {
      designationMap.set(String((d as any).name || "").trim().toLowerCase(), String((d as any)._id));
    }

    const associates = await AssociateModel.find({}, { designation: 1 }).lean();
    let migrated = 0;
    let skipped = 0;

    for (const row of associates as any[]) {
      const raw = row?.designation;
      if (typeof raw !== "string") continue;
      const key = raw.trim().toLowerCase();
      const mappedId = designationMap.get(key);
      if (!mappedId) {
        skipped++;
        continue;
      }
      await AssociateModel.updateOne({ _id: row._id }, { $set: { designation: mappedId } });
      migrated++;
    }

    console.log(`Migrated associates: ${migrated}`);
    console.log(`Skipped (no exact designation match): ${skipped}`);
  } catch (error: any) {
    console.error("Failed to migrate designations:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

