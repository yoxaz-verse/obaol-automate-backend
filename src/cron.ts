import cron from "node-cron";
import logger from "./utils/logger";
import { requeueUnavailableSupportChats } from "./services/supportChatService";
import { synchronizeAllProductBiddingLifecycles } from "./services/productBiddingService";

type ScheduledTask = ReturnType<typeof cron.schedule>;

let scheduledTasks: ScheduledTask[] = [];

export const startCronJobs = async () => {
  if (scheduledTasks.length > 0) return;

  // Return chats to the waiting queue when an assigned support agent has been unavailable for five minutes.
  const supportChatRequeueTask = cron.schedule("* * * * *", async () => {
    try {
      const count = await requeueUnavailableSupportChats();
      if (count > 0) logger.info(`Requeued ${count} customer support conversation(s).`);
    } catch (err) {
      logger.error("Customer support requeue cron error:", err);
    }
  });

  const productBiddingLifecycleTask = cron.schedule("* * * * *", async () => {
    try {
      await synchronizeAllProductBiddingLifecycles();
    } catch (err) {
      logger.error("Product bidding lifecycle cron error:", err);
    }
  });

  scheduledTasks = [supportChatRequeueTask, productBiddingLifecycleTask];
  logger.info(`Started ${scheduledTasks.length} scheduled background jobs.`);
};

export const stopCronJobs = () => {
  for (const task of scheduledTasks) task.stop();
  scheduledTasks = [];
};
