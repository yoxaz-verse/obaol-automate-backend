import { Types } from "mongoose";
import { CatalogItemModel } from "../database/models/catalogItem";
import { DisplayedRateModel } from "../database/models/displayedRate";
export const PAST_LISTING_RETENTION_DAYS = 20;
export const PAST_LISTING_RETENTION_MS = PAST_LISTING_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const pastListingRetentionCutoff = (now = new Date()) =>
  new Date(now.getTime() - PAST_LISTING_RETENTION_MS);

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
