import cron from "node-cron";
import { VariantRateModel } from "./database/models/variantRate";
import logger from "./utils/logger";

// Cron job to run every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    logger.info("Running daily variant rate reset cron job...");
    const result = await VariantRateModel.updateMany(
      { isLive: true },
      { $set: { isLive: false } }
    );
    logger.info(`Successfully offlined ${result.modifiedCount} variant rates.`);
  } catch (err) {
    logger.error("❌ Cron error:", err);
  }
});
