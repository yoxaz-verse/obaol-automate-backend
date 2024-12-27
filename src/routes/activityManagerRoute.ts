// src/routes/activityManager.ts

import { Router } from "express";
import ActivityManagerService from "../services/activityManager";
import { validateActivityManager } from "../middlewares/activityManager";
import { validateUniqueEmail } from "../database/models/emailChecker";

const router = Router();
const activityManagerService = new ActivityManagerService();

router.get(
  "/",
  activityManagerService.getActivityManagers.bind(activityManagerService)
);
router.get(
  "/:id",
  activityManagerService.getActivityManagerById.bind(activityManagerService)
);
router.post(
  "/",
  validateUniqueEmail,
  validateActivityManager,
  activityManagerService.createActivityManager.bind(activityManagerService)
);
router.patch(
  "/:id",
  activityManagerService.updateActivityManager.bind(activityManagerService)
);
router.delete(
  "/:id",
  activityManagerService.deleteActivityManager.bind(activityManagerService)
);

export default router;
