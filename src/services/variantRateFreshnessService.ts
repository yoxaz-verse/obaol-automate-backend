import { Types } from "mongoose";
import { CatalogItemModel } from "../database/models/catalogItem";
import { DisplayedRateModel } from "../database/models/displayedRate";
import { VariantRateModel } from "../database/models/variantRate";

export const LISTING_LIVE_DURATION_HOURS = 24;
export const LISTING_LIVE_DURATION_MS = LISTING_LIVE_DURATION_HOURS * 60 * 60 * 1000;
export const PAST_LISTING_RETENTION_DAYS = 20;
export const PAST_LISTING_RETENTION_MS = PAST_LISTING_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const listingFreshnessCutoff = (now = new Date()) =>
  new Date(now.getTime() - LISTING_LIVE_DURATION_MS);

export const pastListingRetentionCutoff = (now = new Date()) =>
  new Date(now.getTime() - PAST_LISTING_RETENTION_MS);

export const liveFreshnessCondition = (now = new Date()) => ({
  $expr: {
    $gt: [
      { $ifNull: ["$lastLiveDate", { $ifNull: ["$updatedAt", "$createdAt"] }] },
      listingFreshnessCutoff(now),
    ],
  },
});

export const recentPastCondition = (now = new Date()) => ({
  unpublishedAt: { $gt: pastListingRetentionCutoff(now) },
});

export const syncVariantRateAvailability = async (
  ids: Array<string | Types.ObjectId>,
  isLive: boolean
) => {
  if (!ids.length) return;
  await Promise.all([
    CatalogItemModel.updateMany({ baseRateId: { $in: ids } }, { $set: { isLive } }),
    DisplayedRateModel.updateMany({ variantRate: { $in: ids } }, { $set: { isLive } }),
  ]);
};

export const expireStaleVariantRates = async (now = new Date()) => {
  const cutoff = listingFreshnessCutoff(now);
  const stale = await VariantRateModel.find({
    isDeleted: { $ne: true },
    isLive: true,
    $expr: {
      $lte: [
        { $ifNull: ["$lastLiveDate", { $ifNull: ["$updatedAt", "$createdAt"] }] },
        cutoff,
      ],
    },
  }).select("_id").lean();
  const ids = stale.map((row: any) => row._id);
  if (!ids.length) return 0;

  const result = await VariantRateModel.updateMany(
    {
      _id: { $in: ids },
      isLive: true,
      $expr: {
        $lte: [
          { $ifNull: ["$lastLiveDate", { $ifNull: ["$updatedAt", "$createdAt"] }] },
          cutoff,
        ],
      },
    },
    { $set: { isLive: false, unpublishedAt: now } }
  );
  const expiredRows = await VariantRateModel.find({ _id: { $in: ids }, isLive: false }).select("_id").lean();
  await syncVariantRateAvailability(expiredRows.map((row: any) => row._id), false);
  return result.modifiedCount;
};
