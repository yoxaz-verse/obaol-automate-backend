import express from "express";
import LocationService from "../services/location";
import { AuthMiddleware } from "../middlewares/auth";

const router = express.Router();
const locationService = new LocationService();
const authMiddleware = new AuthMiddleware();

router.get("/locations", authMiddleware.validateToken, locationService.getLocations.bind(locationService));
router.get("/locations/:id", authMiddleware.validateToken, locationService.getLocation.bind(locationService));
router.post("/locations", authMiddleware.validateToken, locationService.createLocation.bind(locationService));
router.put("/locations/:id", authMiddleware.validateToken, locationService.updateLocation.bind(locationService));
router.delete("/locations/:id", authMiddleware.validateToken, locationService.deleteLocation.bind(locationService));

export default router;
