import { Router } from "express";
import LocationService from "../services/location";
import LocationMiddleware from "../middlewares/location";

const locationroute = Router();
const locationService = new LocationService();
const locationMiddleware = new LocationMiddleware();

locationroute.get(
  "/",
  locationService.getLocations.bind(locationService)
);
locationroute.get(
  "/:id",
  locationMiddleware.getLocation.bind(locationMiddleware),
  locationService.getLocation.bind(locationService)
);
locationroute.post(
  "/",
  locationMiddleware.createLocation.bind(locationMiddleware),
  locationService.createLocation.bind(locationService)
);
locationroute.patch(
  "/:id",
  locationMiddleware.updateLocation.bind(locationMiddleware),
  locationService.updateLocation.bind(locationService)
);
locationroute.delete(
  "/:id",
  locationMiddleware.deleteLocation.bind(locationMiddleware),
  locationService.deleteLocation.bind(locationService)
);

export default locationroute;
