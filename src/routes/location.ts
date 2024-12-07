import express from "express";
import LocationService from "../services/location";
import authenticateToken from "../middlewares/auth";
// import { AuthMiddleware } from "../middlewares/auth";

const router = express.Router();
const locationService = new LocationService();
// const authMiddleware = new AuthMiddleware();

router.get(
  "/locations",
  authenticateToken,
  locationService.getLocations.bind(locationService)
);
router.get(
  "/locations/:id",
  authenticateToken,
  locationService.getLocation.bind(locationService)
);
router.post(
  "/locations",
  authenticateToken,
  locationService.createLocation.bind(locationService)
);
router.put(
  "/locations/:id",
  authenticateToken,
  locationService.updateLocation.bind(locationService)
);
router.delete(
  "/locations/:id",
  authenticateToken,
  locationService.deleteLocation.bind(locationService)
);

export default router;
