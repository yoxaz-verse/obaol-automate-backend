import mongoose from "mongoose";
import dotenv from "dotenv";
import { VariantRateModel } from "../database/models/variantRate";
import { listingFreshnessCutoff, syncVariantRateAvailability } from "../services/variantRateFreshnessService";

dotenv.config();

export async function backfillVariantRateFreshness(now = new Date()) {
  const rows: any[] = await VariantRateModel.find({ isDeleted: { $ne: true } })
    .select("_id isLive lastLiveAt lastLiveDate unpublishedAt createdAt updatedAt")
    .lean();
  const cutoff = listingFreshnessCutoff(now);
  const staleIds: any[] = [];
  let updated = 0;

  for (const row of rows) {
    if (row.isLive) {
      const publishedAt = row.lastLiveDate || row.updatedAt || row.createdAt;
      const isStale = publishedAt && new Date(publishedAt).getTime() <= cutoff.getTime();
      await VariantRateModel.updateOne(
        { _id: row._id },
        { $set: isStale
          ? { lastLiveAt: publishedAt, lastLiveDate: publishedAt, isLive: false, unpublishedAt: now }
          : { lastLiveAt: publishedAt, lastLiveDate: publishedAt, unpublishedAt: null } }
      );
      if (isStale) staleIds.push(row._id);
      updated += 1;
      continue;
    }

    if (!row.unpublishedAt) {
      const unpublishedAt = row.updatedAt || row.lastLiveDate || row.lastLiveAt || row.createdAt || now;
      await VariantRateModel.updateOne({ _id: row._id }, { $set: { unpublishedAt } });
      updated += 1;
    }
  }

  await syncVariantRateAvailability(staleIds, false);
  return { scanned: rows.length, updated, expired: staleIds.length };
}

if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGODB_URI or MONGO_URI is required.");
  mongoose.connect(mongoUri)
    .then(() => backfillVariantRateFreshness())
    .then((result) => console.log(JSON.stringify(result)))
    .finally(() => mongoose.disconnect());
}
