import { Router } from "express";
import LocationTypeService from "../services/locationType";
import LocationTypeMiddleware from "../middlewares/locationType";

const locationTypeRoute = Router();
const locationTypeService = new LocationTypeService();
const locationTypeMiddleware = new LocationTypeMiddleware();

// GET /api/location-types - Retrieve all location types
locationTypeRoute.get(
  "/",
  locationTypeService.getLocationTypes.bind(locationTypeService)
);

// GET /api/location-types/:id - Retrieve a specific location type
locationTypeRoute.get("/:id", locationTypeService.getLocationType.bind(locationTypeService));

// // POST /api/location-types - Create a new location type
locationTypeRoute.post(
  "/",
  locationTypeMiddleware.validateLocationTypeData.bind(locationTypeMiddleware),
  locationTypeService.createLocationType.bind(locationTypeService)
);

// // PATCH /api/location-types/:id - Update an existing location type
locationTypeRoute.patch(
  "/:id",
  locationTypeMiddleware.validateLocationTypeData.bind(locationTypeMiddleware),
  locationTypeService.updateLocationType.bind(locationTypeService)
);

// // DELETE /api/location-types/:id - Delete a location type
locationTypeRoute.delete("/:id", locationTypeService.deleteLocationType.bind(locationTypeService));

export default locationTypeRoute;
