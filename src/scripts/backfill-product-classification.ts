import mongoose from "mongoose";
import { config } from "dotenv";
import { ProductModel } from "../database/models/product";

config();

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(mongoUri);

  const result = await ProductModel.updateMany(
    {
      $or: [
        { isConventional: { $exists: false } },
        { isNatural: { $exists: false } },
        { isOrganic: { $exists: false } },
        { isIpmQuality: { $exists: false } },
        { isGiTagged: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          isNatural: { $ifNull: ["$isNatural", false] },
          isOrganic: { $ifNull: ["$isOrganic", false] },
          isIpmQuality: { $ifNull: ["$isIpmQuality", false] },
          isGiTagged: { $ifNull: ["$isGiTagged", false] },
          giName: { $ifNull: ["$giName", ""] },
          giCertificateNumber: { $ifNull: ["$giCertificateNumber", ""] },
          giDocumentUrl: { $ifNull: ["$giDocumentUrl", ""] },
        },
      },
      {
        $set: {
          isConventional: {
            $cond: [
              { $or: ["$isNatural", "$isOrganic", "$isGiTagged"] },
              false,
              true,
            ],
          },
        },
      },
    ]
  );

  console.log("Product classification backfill complete:", {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to backfill product classification:", error?.message || error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect failure
  }
  process.exit(1);
});
