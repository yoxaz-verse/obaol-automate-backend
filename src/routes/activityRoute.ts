import { Router } from "express";
import ActivityService from "../services/activity";
import ActivityMiddleware from "../middlewares/activity";

const router = Router();
const activityService = new ActivityService();
const activityMiddleware = new ActivityMiddleware();

router.get(
  "/",
  activityService.getActivities.bind(activityService)
);
router.get(
  "/:id",
  activityMiddleware.getActivity.bind(activityMiddleware),
  activityService.getActivity.bind(activityService)
);
router.post(
  "/",
  activityMiddleware.createActivity.bind(activityMiddleware),
  activityService.createActivity.bind(activityService)
);
router.patch(
  "/:id",
  activityMiddleware.updateActivity.bind(activityMiddleware),
  activityService.updateActivity.bind(activityService)
);
router.delete(
  "/:id",
  activityMiddleware.deleteActivity.bind(activityMiddleware),
  activityService.deleteActivity.bind(activityService)
);

export default router;
