import { Router } from "express";
import LocationManagerService from "../services/locationManager";
import LocationManagerMiddleware from "../middlewares/locationManager";
import authenticateToken from "../middlewares/auth";

const locationManagerRoute = Router();
const locationManagerService = new LocationManagerService();
const locationManagerMiddleware = new LocationManagerMiddleware();

locationManagerRoute.get(
  "/",
  authenticateToken,
  locationManagerService.getLocationManagers.bind(locationManagerService)
);
locationManagerRoute.get(
  "/:id",
  authenticateToken,
  locationManagerMiddleware.getLocationManager.bind(locationManagerMiddleware),
  locationManagerService.getLocationManager.bind(locationManagerService)
);
locationManagerRoute.post(
  "/",
  authenticateToken,
  locationManagerMiddleware.createLocationManager.bind(
    locationManagerMiddleware
  ),
  locationManagerService.createLocationManager.bind(locationManagerService)
);
locationManagerRoute.patch(
  "/:id",
  authenticateToken,
  locationManagerMiddleware.updateLocationManager.bind(
    locationManagerMiddleware
  ),
  locationManagerService.updateLocationManager.bind(locationManagerService)
);
locationManagerRoute.delete(
  "/:id",
  authenticateToken,
  locationManagerMiddleware.deleteLocationManager.bind(
    locationManagerMiddleware
  ),
  locationManagerService.deleteLocationManager.bind(locationManagerService)
);

export default locationManagerRoute;
