import { Router } from "express";
import ActivityStatusService from "../services/activityStatus";
import ActivityStatusMiddleware from "../middlewares/activityStatus";

const activityStatusroute = Router();
const activityStatusService = new ActivityStatusService();
const activityStatusMiddleware = new ActivityStatusMiddleware();

activityStatusroute.get(
  "/",
  activityStatusService.getActivityStatuses.bind(activityStatusService)
);
activityStatusroute.get(
  "/:id",
  activityStatusMiddleware.getActivityStatus.bind(activityStatusMiddleware),
  activityStatusService.getActivityStatus.bind(activityStatusService)
);
activityStatusroute.post(
  "/",
  activityStatusMiddleware.createActivityStatus.bind(activityStatusMiddleware),
  activityStatusService.createActivityStatus.bind(activityStatusService)
);
activityStatusroute.patch(
  "/:id",
  activityStatusMiddleware.updateActivityStatus.bind(activityStatusMiddleware),
  activityStatusService.updateActivityStatus.bind(activityStatusService)
);
activityStatusroute.delete(
  "/:id",
  activityStatusMiddleware.deleteActivityStatus.bind(activityStatusMiddleware),
  activityStatusService.deleteActivityStatus.bind(activityStatusService)
);

export default activityStatusroute;
