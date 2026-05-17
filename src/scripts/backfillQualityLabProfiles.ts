import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";

dotenv.config();

const hasValues = (values: unknown): boolean =>
  Array.isArray(values) ? values.some((value) => String(value || "").trim().length > 0) : false;

const hasValidCoords = (row: any): boolean => {
  const lat = Number(row?.location?.latitude);
  const lng = Number(row?.location?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    const rows = await AssociateCompanyModel.find({ isDeleted: { $ne: true } }).select(
      "_id name email phone phoneSecondary location serviceCapabilities labTests labCertifications labSpecifications labAcceptedItems labNotes isQualityLabListed labDisplayName labContactEmail labContactPhone labContactPhoneSecondary"
    );

    let flaggedCount = 0;
    let seededCount = 0;

    for (const row of rows as any[]) {
      const hasLabMetadata =
        hasValues(row.labTests) ||
        hasValues(row.labCertifications) ||
        hasValues(row.labSpecifications) ||
        hasValues(row.labAcceptedItems) ||
        String(row?.labNotes || "").trim().length > 0 ||
        hasValidCoords(row);

      if (!hasLabMetadata) continue;

      let touched = false;
      if (row.isQualityLabListed !== true) {
        row.isQualityLabListed = true;
        flaggedCount += 1;
        touched = true;
      }
      if (!String(row.labDisplayName || "").trim() && String(row.name || "").trim()) {
        row.labDisplayName = String(row.name || "").trim();
        seededCount += 1;
        touched = true;
      }
      if (!String(row.labContactEmail || "").trim() && String(row.email || "").trim()) {
        row.labContactEmail = String(row.email || "").trim();
        seededCount += 1;
        touched = true;
      }
      if (!String(row.labContactPhone || "").trim() && String(row.phone || "").trim()) {
        row.labContactPhone = String(row.phone || "").trim();
        seededCount += 1;
        touched = true;
      }
      if (!String(row.labContactPhoneSecondary || "").trim() && String(row.phoneSecondary || "").trim()) {
        row.labContactPhoneSecondary = String(row.phoneSecondary || "").trim();
        seededCount += 1;
        touched = true;
      }

      if (touched) await row.save();
    }

    console.log(`Backfill complete. Listed labs flagged: ${flaggedCount}, lab fields seeded: ${seededCount}`);
  } catch (error: any) {
    console.error("Failed to backfill quality lab profiles:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
