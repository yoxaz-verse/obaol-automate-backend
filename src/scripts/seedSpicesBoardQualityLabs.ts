import dotenv from "dotenv";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { PincodeEntryModel } from "../database/models/pincodeEntry";
import { spicesBoardQualityLabs } from "../data/spicesBoardQualityLabs";

dotenv.config();

const normalizeKey = (value: string) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function findPincodeEntry(pincode?: string) {
  const normalized = String(pincode || "").replace(/\D/g, "").slice(0, 6);
  if (!normalized) return null;
  return PincodeEntryModel.findOne({ pincode: normalized, isDeleted: { $ne: true } }).select("_id").lean();
}

async function run() {
  const uri = process.env.MONGODB_URI as string;
  if (!uri) throw new Error("MONGODB_URI is missing.");

  await mongoose.connect(uri);

  let created = 0;
  let updated = 0;

  try {
    for (const lab of spicesBoardQualityLabs) {
      const sourceDate = lab.sourceDate ? new Date(lab.sourceDate) : null;
      const pincodeEntry = await findPincodeEntry(lab.pincode);
      const externalKey = `${lab.source}:${normalizeKey(lab.name)}:${lab.pincode || normalizeKey(lab.address)}`;
      const payload: any = {
        name: lab.name,
        email: `${externalKey}@external-directory.obaol.local`,
        isExternalDirectoryListing: true,
        externalListingSource: lab.source,
        externalListingSourceUrl: lab.sourceUrl,
        externalListingReference: lab.reference,
        externalListingDate: sourceDate,
        geoType: "INDIAN",
        serviceCapabilities: ["QUALITY_TESTING"],
        isQualityLabListed: true,
        labDisplayName: lab.displayName,
        labContactEmail: lab.contactEmail || "",
        labContactPhone: lab.contactPhone || "",
        labContactPhoneSecondary: lab.contactPhoneSecondary || "",
        labTests: lab.tests || [],
        labCertifications: lab.certifications || [],
        labSpecifications: lab.specifications || [],
        labAcceptedItems: lab.acceptedItems || [],
        labNotes: lab.notes,
        labListingState: "LIVE",
        labActivatedAt: new Date(),
        address: lab.address,
        location: lab.location,
        tags: ["Spices Board", lab.source === "SPICES_BOARD_QEL" ? "QEL" : "Empanelled Lab"],
        description: lab.notes,
        reviewNotes: externalKey,
        registrationStatus: "APPROVED",
        isApproved: true,
      };

      if (pincodeEntry?._id) payload.pincodeEntry = pincodeEntry._id;

      const existing = await AssociateCompanyModel.findOne({
        isExternalDirectoryListing: true,
        externalListingSource: lab.source,
        externalListingReference: lab.reference,
      });

      if (existing) {
        existing.set(payload);
        await existing.save();
        updated += 1;
      } else {
        await AssociateCompanyModel.create(payload);
        created += 1;
      }
    }

    const total = await AssociateCompanyModel.countDocuments({
      isExternalDirectoryListing: true,
      externalListingSource: { $in: ["SPICES_BOARD_QEL", "SPICES_BOARD_EMPANELLED"] },
      isDeleted: { $ne: true },
    });

    console.log(`Spices Board quality lab seed complete. Created: ${created}, updated: ${updated}, external lab total: ${total}.`);
    if (spicesBoardQualityLabs.length !== 29) {
      throw new Error(`Expected 29 seed records, found ${spicesBoardQualityLabs.length}.`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("Failed to seed Spices Board quality labs:", error?.message || error);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exitCode = 1;
});
