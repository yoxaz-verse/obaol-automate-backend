// cron.ts
import cron from "node-cron";
import { deactivateExpiredVariantRates } from "./services/deactivateExpired";

cron.schedule("0 * * * *", () => {
  console.log("⏱ Cron: Checking expired variant rates...");
  deactivateExpiredVariantRates().catch((err) => {
    console.error("❌ Cron error:", err);
  });
});
