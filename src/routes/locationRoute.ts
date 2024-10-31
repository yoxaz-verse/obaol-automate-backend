import { Router } from "express";
import LocationService from "../services/location";
import LocationMiddleware from "../middlewares/location";
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Define the uploads directory
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure that the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

const locationRoute = Router();
const locationService = new LocationService();
const locationMiddleware = new LocationMiddleware();

locationRoute.get("/", locationService.getLocations.bind(locationService));
locationRoute.get(
  "/:id",
  locationMiddleware.getLocation.bind(locationMiddleware),
  locationService.getLocation.bind(locationService)
);
locationRoute.post(
  "/",
  upload.single('image'),
  locationMiddleware.createLocation.bind(locationMiddleware),
  locationService.createLocation.bind(locationService)
);
locationRoute.patch(
  "/:id",
  upload.single('image'),
  locationMiddleware.updateLocation.bind(locationMiddleware),
  locationService.updateLocation.bind(locationService)
);
locationRoute.delete(
  "/:id",
  locationMiddleware.deleteLocation.bind(locationMiddleware),
  locationService.deleteLocation.bind(locationService)
);

export default locationRoute;

