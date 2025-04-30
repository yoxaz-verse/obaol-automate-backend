import { VariantRateModel } from "../database/models/variantRate";

export async function deactivateExpiredVariantRates(): Promise<void> {
  const now = new Date();

  const expiredRates = await VariantRateModel.find({
    isLive: true,
    lastLiveAt: { $ne: null }, // DB filter
  });

  const updates = expiredRates.filter((rate) => {
    if (!rate.lastLiveAt) return false; // TS safety

    const expiryDate = new Date(rate.lastLiveAt);
    expiryDate.setDate(expiryDate.getDate() + (rate.duration || 1));
    return expiryDate <= now;
  });

  for (const rate of updates) {
    rate.isLive = false;
    await rate.save();
    console.log(`✅ Deactivated expired variant rate: ${rate._id}`);
  }
}
