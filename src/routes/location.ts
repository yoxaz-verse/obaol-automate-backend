import express from "express";
import LocationService from "../services/location";
// import { AuthMiddleware } from "../middlewares/auth";

const router = express.Router();
const locationService = new LocationService();
// const authMiddleware = new AuthMiddleware();

router.get("/locations", locationService.getLocations.bind(locationService));
router.get("/locations/:id", locationService.getLocation.bind(locationService));
router.post("/locations", locationService.createLocation.bind(locationService));
router.put(
  "/locations/:id",
  locationService.updateLocation.bind(locationService)
);
router.delete(
  "/locations/:id",
  locationService.deleteLocation.bind(locationService)
);

export default router;
