import { Router } from "express";
import LocationManagerService from "../services/locationManager";
import LocationManagerMiddleware from "../middlewares/locationManager";

const locationManagerRoute = Router();
const locationManagerService = new LocationManagerService();
const locationManagerMiddleware = new LocationManagerMiddleware();

locationManagerRoute.get("/", locationManagerService.getLocationManagers.bind(locationManagerService));
locationManagerRoute.get(
  "/:id",
  locationManagerMiddleware.getLocationManager.bind(locationManagerMiddleware),
  locationManagerService.getLocationManager.bind(locationManagerService)
);
locationManagerRoute.post(
  "/",
  locationManagerMiddleware.createLocationManager.bind(locationManagerMiddleware),
  locationManagerService.createLocationManager.bind(locationManagerService)
);
locationManagerRoute.patch(
  "/:id",
  locationManagerMiddleware.updateLocationManager.bind(locationManagerMiddleware),
  locationManagerService.updateLocationManager.bind(locationManagerService)
);
locationManagerRoute.delete(
  "/:id",
  locationManagerMiddleware.deleteLocationManager.bind(locationManagerMiddleware),
  locationManagerService.deleteLocationManager.bind(locationManagerService)
);

export default locationManagerRoute;

