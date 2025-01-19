import { Router } from "express";
import LocationService from "../services/location";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import LocationMiddleware from "../middlewares/location";
import authenticateToken from "../middlewares/auth";

const locationRoute = Router();
const locationService = new LocationService();
const locationMiddleware = new LocationMiddleware();

locationRoute.get(
  "/",
  authenticateToken,
  locationService.getLocations.bind(locationService)
);
locationRoute.get(
  "/:id",
  authenticateToken,
  // locationMiddleware.getLocation.bind(locationMiddleware),
  locationService.getLocation.bind(locationService)
);
locationRoute.post(
  "/",
  // upload.single("image"),
  authenticateToken,
  // locationMiddleware.validateCreate.bind(locationMiddleware),
  locationService.createLocation.bind(locationService)
);
locationRoute.patch(
  "/:id",
  // upload.single("image"),
  authenticateToken,
  locationMiddleware.validateUpdate.bind(locationMiddleware),
  locationService.updateLocation.bind(locationService)
);
locationRoute.delete(
  "/:id",
  authenticateToken,
  // locationMiddleware.deleteLocation.bind(locationMiddleware),
  locationService.deleteLocation.bind(locationService)
);
locationRoute.post(
  "/bulk",
  authenticateToken,
  locationMiddleware.validateBulkCreateLocations.bind(locationMiddleware),
  locationService.bulkCreateLocations.bind(locationService)
);

export default locationRoute;
