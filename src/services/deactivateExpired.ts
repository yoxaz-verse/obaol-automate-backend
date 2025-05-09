import { VariantRateModel } from "../database/models/variantRate";
import dayjs from "dayjs";

export async function deactivateExpiredVariantRates(): Promise<void> {
  const now = dayjs();

  const expiredRates = await VariantRateModel.find({
    isLive: true,
    lastLiveAt: { $ne: null },
  });

  const updates = expiredRates.filter((rate) => {
    if (!rate.lastLiveAt) return false;

    const expiryDate = dayjs(rate.lastLiveAt).add(rate.duration || 1, "day");
    return expiryDate.isBefore(now);
  });

  for (const rate of updates) {
    rate.isLive = false;
    await rate.save();
    console.log(`✅ Deactivated expired variant rate: ${rate._id}`);
  }
}
