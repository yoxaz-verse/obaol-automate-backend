import { Router } from "express";
import ActivityStatusService from "../services/activityStatus";
import ActivityStatusMiddleware from "../middlewares/activityStatus";

const router = Router();
const activityStatusService = new ActivityStatusService();
const activityStatusMiddleware = new ActivityStatusMiddleware();

// GET all activity statuses
router.get(
  "/",
  activityStatusService.getActivityStatuses.bind(activityStatusService)
);

// GET activity status by ID
router.get(
  "/:id",
  activityStatusMiddleware.validateGet.bind(activityStatusMiddleware),
  activityStatusService.getActivityStatus.bind(activityStatusService)
);

// CREATE a new activity status
router.post(
  "/",
  activityStatusMiddleware.validateCreate.bind(activityStatusMiddleware),
  activityStatusService.createActivityStatus.bind(activityStatusService)
);

// UPDATE an activity status
router.patch(
  "/:id",
  activityStatusMiddleware.validateUpdate.bind(activityStatusMiddleware),
  activityStatusService.updateActivityStatus.bind(activityStatusService)
);

// DELETE an activity status
router.delete(
  "/:id",
  activityStatusMiddleware.validateDelete.bind(activityStatusMiddleware),
  activityStatusService.deleteActivityStatus.bind(activityStatusService)
);

export default router;
