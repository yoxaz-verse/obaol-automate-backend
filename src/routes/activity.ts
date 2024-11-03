import { Router } from "express";
import ActivityService from "../services/activity";
import ActivityMiddleware from "../middlewares/activity";

const router = Router();
const activityService = new ActivityService();
const activityMiddleware = new ActivityMiddleware();

// GET all activities
router.get("/", activityService.getActivities.bind(activityService));

// GET activity by ID
router.get(
  "/:id",
  activityMiddleware.validateGet.bind(activityMiddleware),
  activityService.getActivity.bind(activityService)
);

// CREATE a new activity
router.post(
  "/",
  activityMiddleware.validateCreate.bind(activityMiddleware),
  activityService.createActivity.bind(activityService)
);

// UPDATE an activity
router.patch(
  "/:id",
  activityMiddleware.validateUpdate.bind(activityMiddleware),
  activityService.updateActivity.bind(activityService)
);

// DELETE an activity
router.delete(
  "/:id",
  activityMiddleware.validateDelete.bind(activityMiddleware),
  activityService.deleteActivity.bind(activityService)
);

export default router;
