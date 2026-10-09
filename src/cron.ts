import cron from "node-cron";
import { VariantRateModel } from "./database/models/variantRate";
import logger from "./utils/logger";
import { requeueUnavailableSupportChats } from "./services/supportChatService";

type ScheduledTask = ReturnType<typeof cron.schedule>;

let scheduledTasks: ScheduledTask[] = [];

export const startCronJobs = () => {
  if (scheduledTasks.length > 0) return;

  // Cron job to run every day at midnight
  const variantRateResetTask = cron.schedule("0 0 * * *", async () => {
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

  // Return chats to the waiting queue when an assigned support agent has been unavailable for five minutes.
  const supportChatRequeueTask = cron.schedule("* * * * *", async () => {
    try {
      const count = await requeueUnavailableSupportChats();
      if (count > 0) logger.info(`Requeued ${count} customer support conversation(s).`);
    } catch (err) {
      logger.error("Customer support requeue cron error:", err);
    }
  });

  scheduledTasks = [variantRateResetTask, supportChatRequeueTask];
  logger.info(`Started ${scheduledTasks.length} scheduled background jobs.`);
};

export const stopCronJobs = () => {
  for (const task of scheduledTasks) task.stop();
  scheduledTasks = [];
};
