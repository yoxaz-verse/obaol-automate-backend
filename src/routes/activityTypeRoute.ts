import { Router } from "express";
import ActivityTypeService from "../services/activityType";
import ActivityTypeMiddleware from "../middlewares/activityType";

const activityTypeRoute = Router();
const activityTypeService = new ActivityTypeService();
const activityTypeMiddleware = new ActivityTypeMiddleware();

activityTypeRoute.get("/", activityTypeService.getActivityTypes.bind(activityTypeService));
activityTypeRoute.get(
  "/:id",
  activityTypeMiddleware.getActivityType.bind(activityTypeMiddleware),
  activityTypeService.getActivityType.bind(activityTypeService)
);
activityTypeRoute.post(
  "/",
  activityTypeMiddleware.createActivityType.bind(activityTypeMiddleware),
  activityTypeService.createActivityType.bind(activityTypeService)
);
activityTypeRoute.patch(
  "/:id",
  activityTypeMiddleware.updateActivityType.bind(activityTypeMiddleware),
  activityTypeService.updateActivityType.bind(activityTypeService)
);
activityTypeRoute.delete(
  "/:id",
  activityTypeMiddleware.deleteActivityType.bind(activityTypeMiddleware),
  activityTypeService.deleteActivityType.bind(activityTypeService)
);

export default activityTypeRoute;
