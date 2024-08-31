import { Router } from "express";
import LocationTypeService from "../services/locationType";
import LocationTypeMiddleware from "../middlewares/locationType";

const locationTyperoute = Router();
const locationTypeService = new LocationTypeService();
const locationTypeMiddleware = new LocationTypeMiddleware();

locationTyperoute.get(
  "/",
  locationTypeService.getLocationTypes.bind(locationTypeService)
);
locationTyperoute.get(
  "/:id",
  locationTypeMiddleware.getLocationType.bind(locationTypeMiddleware),
  locationTypeService.getLocationType.bind(locationTypeService)
);
locationTyperoute.post(
  "/",
  locationTypeMiddleware.createLocationType.bind(locationTypeMiddleware),
  locationTypeService.createLocationType.bind(locationTypeService)
);
locationTyperoute.patch(
  "/:id",
  locationTypeMiddleware.updateLocationType.bind(locationTypeMiddleware),
  locationTypeService.updateLocationType.bind(locationTypeService)
);
locationTyperoute.delete(
  "/:id",
  locationTypeMiddleware.deleteLocationType.bind(locationTypeMiddleware),
  locationTypeService.deleteLocationType.bind(locationTypeService)
);

export default locationTyperoute;
