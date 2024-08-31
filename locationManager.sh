#!/bin/bash

# Create model
cat <<EOT > src/database/models/location.ts
import mongoose from "mongoose";

interface ILocation extends mongoose.Document {
  name: string;
  address: string;
  locationType: mongoose.Schema.Types.ObjectId;
  locationManager: mongoose.Schema.Types.ObjectId;
}

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    locationType: { type: mongoose.Schema.Types.ObjectId, ref: "LocationType", required: true },
    locationManager: { type: mongoose.Schema.Types.ObjectId, ref: "LocationManager", required: true }
  },
  { timestamps: true }
);

export const LocationModel = mongoose.model<ILocation>("Location", LocationSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/location.ts
import { Request } from "express";
import { LocationModel } from "../models/location";
import { ILocation, ICreateLocation, IUpdateLocation } from "../../interfaces/location";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class LocationRepository {
  public async getLocations(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ILocation[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const locations = await LocationModel.find(query)
        .populate("locationType")
        .populate("locationManager")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await LocationModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: locations as ILocation[],
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocations");
      throw error;
    }
  }

  public async getLocationById(req: Request, id: string): Promise<ILocation> {
    try {
      const location = await LocationModel.findById(id)
        .populate("locationType")
        .populate("locationManager")
        .lean();
      if (!location) {
        throw new Error("Location not found");
      }
      return location as ILocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocationById");
      throw error;
    }
  }

  public async createLocation(
    req: Request,
    locationData: ICreateLocation
  ): Promise<ILocation> {
    try {
      const newLocation = await LocationModel.create(locationData);
      return newLocation.toObject();
    } catch (error) {
      await logError(error, req, "LocationRepository-createLocation");
      throw error;
    }
  }

  public async updateLocation(
    req: Request,
    id: string,
    locationData: Partial<IUpdateLocation>
  ): Promise<ILocation> {
    try {
      const updatedLocation = await LocationModel.findByIdAndUpdate(id, locationData, {
        new: true,
      }).populate("locationType")
        .populate("locationManager");
      if (!updatedLocation) {
        throw new Error("Failed to update location");
      }
      return updatedLocation.toObject();
    } catch (error) {
      await logError(error, req, "LocationRepository-updateLocation");
      throw error;
    }
  }

  public async deleteLocation(req: Request, id: string): Promise<ILocation> {
    try {
      const deletedLocation = await LocationModel.findByIdAndDelete(id)
        .populate("locationType")
        .populate("locationManager");
      if (!deletedLocation) {
        throw new Error("Failed to delete location");
      }
      return deletedLocation.toObject();
    } catch (error) {
      await logError(error, req, "LocationRepository-deleteLocation");
      throw error;
    }
  }
}

export default LocationRepository;
EOT

# Create service
cat <<EOT > src/services/location.ts
import { Request, Response } from "express";
import LocationRepository from "../database/repositories/location";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class LocationService {
  private locationRepository: LocationRepository;

  constructor() {
    this.locationRepository = new LocationRepository();
  }

  public async getLocations(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locations = await this.locationRepository.getLocations(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(locations, "Locations retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationService-getLocations");
      res.sendError(error, "Locations retrieval failed");
    }
  }

  public async getLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await this.locationRepository.getLocationById(req, id);
      res.sendFormatted(location, "Location retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationService-getLocation");
      res.sendError(error, "Location retrieval failed");
    }
  }

  public async createLocation(req: Request, res: Response) {
    try {
      const locationData = req.body;
      const newLocation = await this.locationRepository.createLocation(req, locationData);
      res.sendFormatted(newLocation, "Location created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationService-createLocation");
      res.sendError(error, "Location creation failed");
    }
  }

  public async updateLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationData = req.body;
      const updatedLocation = await this.locationRepository.updateLocation(
        req,
        id,
        locationData
      );
      res.sendFormatted(updatedLocation, "Location updated successfully");
    } catch (error) {
      await logError(error, req, "LocationService-updateLocation");
      res.sendError(error, "Location update failed");
    }
  }

  public async deleteLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocation = await this.locationRepository.deleteLocation(req, id);
      res.sendFormatted(deletedLocation, "Location deleted successfully");
    } catch (error) {
      await logError(error, req, "LocationService-deleteLocation");
      res.sendError(error, "Location deletion failed");
    }
  }
}

export default LocationService;
EOT

# Create middleware
cat <<EOT > src/middlewares/location.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationMiddleware {
  public async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address, locationType, locationManager } = req.body;
      if (!name || !address || !locationType || !locationManager) {
        res.sendError(
          "ValidationError: Name, Address, LocationType, and LocationManager must be provided",
          "Name, Address, LocationType, and LocationManager must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address, locationType, locationManager } = req.body;
      if (!name && !address && !locationType && !locationManager) {
        res.sendError(
          "ValidationError: At least one field must be provided",
          "At least one field must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/location.ts
import { ILocationType } from "./locationType";
import { ILocationManager } from "./locationManager";
import mongoose from "mongoose";

export interface ILocation {
  _id: string;
  name: string;
  address: string;
  locationType: mongoose.Schema.Types.ObjectId | ILocationType;
  locationManager: mongoose.Schema.Types.ObjectId | ILocationManager;
}

export interface ICreateLocation {
  name: string;
  address: string;
  locationType: string;
  locationManager: string;
}

export interface IUpdateLocation {
  name?: string;
  address?: string;
  locationType?: string;
  locationManager?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/locationRoute.ts
import { Router } from "express";
import LocationService from "../services/location";
import LocationMiddleware from "../middlewares/location";

const router = Router();
const locationService = new LocationService();
const locationMiddleware = new LocationMiddleware();

router.get(
  "/",
  locationService.getLocations.bind(locationService)
);
router.get(
  "/:id",
  locationMiddleware.getLocation.bind(locationMiddleware),
  locationService.getLocation.bind(locationService)
);
router.post(
  "/",
  locationMiddleware.createLocation.bind(locationMiddleware),
  locationService.createLocation.bind(locationService)
);
router.patch(
  "/:id",
  locationMiddleware.updateLocation.bind(locationMiddleware),
  locationService.updateLocation.bind(locationService)
);
router.delete(
  "/:id",
  locationMiddleware.deleteLocation.bind(locationMiddleware),
  locationService.deleteLocation.bind(locationService)
);

export default router;
EOT

echo "Location module generated successfully."
