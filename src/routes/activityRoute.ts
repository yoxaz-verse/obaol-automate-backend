import { Router } from "express";
import ActivityService from "../services/activity";
import ActivityMiddleware from "../middlewares/activity";
import authenticateToken from "../middlewares/auth";

const router = Router();
const activityService = new ActivityService();
const activityMiddleware = new ActivityMiddleware();

// GET all activities
router.get(
  "/",
  authenticateToken,
  activityService.getActivities.bind(activityService)
);

// GET activity by ID
router.get(
  "/:id",
  authenticateToken,
  activityMiddleware.validateGet.bind(activityMiddleware),
  activityService.getActivity.bind(activityService)
);

// CREATE a new activity
router.post(
  "/",
  authenticateToken,
  activityMiddleware.validateCreate.bind(activityMiddleware),
  activityService.createActivity.bind(activityService)
);

// UPDATE an activity
router.patch(
  "/:id",
  authenticateToken,
  activityMiddleware.validateUpdate.bind(activityMiddleware),
  activityService.updateActivity.bind(activityService)
);

// DELETE an activity
router.delete(
  "/:id",
  authenticateToken,
  activityMiddleware.validateDelete.bind(activityMiddleware),
  activityService.deleteActivity.bind(activityService)
);

export default router;
