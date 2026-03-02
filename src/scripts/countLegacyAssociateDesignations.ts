import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";

dotenv.config();

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) {
      throw new Error("MONGODB_URI is missing.");
    }
    await mongoose.connect(uri);

    const all = await AssociateModel.find({}, { designation: 1 }).lean();
    const isObjectIdLike = (value: any) =>
      value &&
      (typeof value === "string" || typeof value === "object") &&
      mongoose.Types.ObjectId.isValid(String((value as any)?._id || value));

    const legacy = all.filter((row: any) => {
      const d = row?.designation;
      return typeof d === "string" && !isObjectIdLike(d);
    });

    console.log(`Total associates: ${all.length}`);
    console.log(`Legacy string designations: ${legacy.length}`);
    if (legacy.length > 0) {
      const sample = legacy.slice(0, 20).map((row: any) => row.designation);
      console.log("Sample legacy values:", sample);
    }
  } catch (error: any) {
    console.error("Failed to count legacy designations:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

