import { Router } from "express";
import LocationManagerService from "../services/locationManager";
import LocationManagerMiddleware from "../middlewares/locationManager";

const locationManagerroute = Router();
const locationManagerService = new LocationManagerService();
const locationManagerMiddleware = new LocationManagerMiddleware();

locationManagerroute.get(
  "/",
  locationManagerService.getLocationManagers.bind(locationManagerService)
);
locationManagerroute.get(
  "/:id",
  locationManagerMiddleware.getLocationManager.bind(locationManagerMiddleware),
  locationManagerService.getLocationManager.bind(locationManagerService)
);
locationManagerroute.post(
  "/",
  locationManagerMiddleware.createLocationManager.bind(locationManagerMiddleware),
  locationManagerService.createLocationManager.bind(locationManagerService)
);
locationManagerroute.patch(
  "/:id",
  locationManagerMiddleware.updateLocationManager.bind(locationManagerMiddleware),
  locationManagerService.updateLocationManager.bind(locationManagerService)
);
locationManagerroute.delete(
  "/:id",
  locationManagerMiddleware.deleteLocationManager.bind(locationManagerMiddleware),
  locationManagerService.deleteLocationManager.bind(locationManagerService)
);

export default locationManagerroute;
