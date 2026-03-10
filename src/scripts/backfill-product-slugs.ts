import dotenv from "dotenv";
import mongoose from "mongoose";
import { ProductModel } from "../database/models/product";

dotenv.config();

const slugify = (value: string) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const uniqueSlug = async (baseValue: string, selfId: any) => {
  const base = slugify(baseValue) || "product";
  let candidate = base;
  let i = 1;
  while (true) {
    const found = await ProductModel.findOne({
      slug: candidate,
      _id: { $ne: selfId },
    }).select("_id").lean();
    if (!found) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
};

async function run() {
  try {
    const uri = (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");

    await mongoose.connect(uri);

    const rows = await ProductModel.find({
      $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
      isDeleted: { $ne: true },
    }).select("_id name slug");

    let updated = 0;
    for (const row of rows) {
      const candidate = await uniqueSlug((row as any).name || "product", (row as any)._id);
      (row as any).slug = candidate;
      await row.save();
      updated += 1;
    }

    console.log(`Products updated with slug: ${updated}`);
  } catch (error: any) {
    console.error("Failed to backfill product slugs:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
