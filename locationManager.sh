#!/bin/bash

# Create model
cat <<EOT > src/database/models/locationManager.ts
import mongoose from "mongoose";

interface ILocationManager extends mongoose.Document {
  code: string;
  managingLocations: string[];
  name: string;
}

const LocationManagerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    managingLocations: [{ type: String, required: true }],
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const LocationManagerModel = mongoose.model<ILocationManager>("LocationManager", LocationManagerSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/locationManager.ts
import { Request } from "express";
import { LocationManagerModel } from "../models/locationManager";
import { ILocationManager, ICreateLocationManager, IUpdateLocationManager } from "../../interfaces/locationManager";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class LocationManagerRepository {
  public async getLocationManagers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ILocationManager[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const locationManagers = await LocationManagerModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await LocationManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: locationManagers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-getLocationManagers");
      throw error;
    }
  }

  public async getLocationManagerById(req: Request, id: string): Promise<ILocationManager> {
    try {
      const locationManager = await LocationManagerModel.findById(id).lean();
      if (!locationManager) {
        throw new Error("Location Manager not found");
      }
      return locationManager;
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-getLocationManagerById");
      throw error;
    }
  }

  public async createLocationManager(
    req: Request,
    locationManagerData: ICreateLocationManager
  ): Promise<ILocationManager> {
    try {
      const newLocationManager = await LocationManagerModel.create(locationManagerData);
      return newLocationManager.toObject();
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-createLocationManager");
      throw error;
    }
  }

  public async updateLocationManager(
    req: Request,
    id: string,
    locationManagerData: Partial<IUpdateLocationManager>
  ): Promise<ILocationManager> {
    try {
      const updatedLocationManager = await LocationManagerModel.findByIdAndUpdate(id, locationManagerData, {
        new: true,
      });
      if (!updatedLocationManager) {
        throw new Error("Failed to update Location Manager");
      }
      return updatedLocationManager.toObject();
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-updateLocationManager");
      throw error;
    }
  }

  public async deleteLocationManager(req: Request, id: string): Promise<ILocationManager> {
    try {
      const deletedLocationManager = await LocationManagerModel.findByIdAndDelete(id);
      if (!deletedLocationManager) {
        throw new Error("Failed to delete Location Manager");
      }
      return deletedLocationManager.toObject();
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-deleteLocationManager");
      throw error;
    }
  }
}

export default LocationManagerRepository;
EOT

# Create service
cat <<EOT > src/services/locationManager.ts
import { Request, Response } from "express";
import LocationManagerRepository from "../database/repositories/locationManager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class LocationManagerService {
  private locationManagerRepository: LocationManagerRepository;

  constructor() {
    this.locationManagerRepository = new LocationManagerRepository();
  }

  public async getLocationManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locationManagers = await this.locationManagerRepository.getLocationManagers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(locationManagers, "Location Managers retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-getLocationManagers");
      res.sendError(error, "Location Managers retrieval failed");
    }
  }

  public async getLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationManager = await this.locationManagerRepository.getLocationManagerById(req, id);
      res.sendFormatted(locationManager, "Location Manager retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-getLocationManager");
      res.sendError(error, "Location Manager retrieval failed");
    }
  }

  public async createLocationManager(req: Request, res: Response) {
    try {
      const locationManagerData = req.body;
      const newLocationManager = await this.locationManagerRepository.createLocationManager(req, locationManagerData);
      res.sendFormatted(newLocationManager, "Location Manager created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationManagerService-createLocationManager");
      res.sendError(error, "Location Manager creation failed");
    }
  }

  public async updateLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationManagerData = req.body;
      const updatedLocationManager = await this.locationManagerRepository.updateLocationManager(
        req,
        id,
        locationManagerData
      );
      res.sendFormatted(updatedLocationManager, "Location Manager updated successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-updateLocationManager");
      res.sendError(error, "Location Manager update failed");
    }
  }

  public async deleteLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationManager = await this.locationManagerRepository.deleteLocationManager(req, id);
      res.sendFormatted(deletedLocationManager, "Location Manager deleted successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-deleteLocationManager");
      res.sendError(error, "Location Manager deletion failed");
    }
  }
}

export default LocationManagerService;
EOT

# Create middleware
cat <<EOT > src/middlewares/locationManager.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationManagerMiddleware {
  public async createLocationManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, managingLocations, name } = req.body;
      if (!code || !managingLocations || !name) {
        res.sendError(
          "ValidationError: Code, Managing Locations, and Name must be provided",
          "Code, Managing Locations, and Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationManagerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateLocationManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, managingLocations, name } = req.body;
      if (!code || !managingLocations || !name) {
        res.sendError(
          "ValidationError: Code, Managing Locations, and Name must be provided",
          "Code, Managing Locations, and Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationManagerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteLocationManager(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationManagerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getLocationManager(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationManagerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationManagerMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/locationManager.ts
export interface ILocationManager {
  _id: string;
  code: string;
  managingLocations: string[];
  name: string;
}

export interface ICreateLocationManager {
  code: string;
  managingLocations: string[];
  name: string;
}

export interface IUpdateLocationManager {
  code?: string;
  managingLocations?: string[];
  name?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/locationManagerRoute.ts
import { Router } from "express";
import LocationManagerService from "../services/locationManager";
import LocationManagerMiddleware from "../middlewares/locationManager";

const router = Router();
const locationManagerService = new LocationManagerService();
const locationManagerMiddleware = new LocationManagerMiddleware();

router.get(
  "/",
  locationManagerMiddleware.getLocationManager.bind(locationManagerMiddleware),
  locationManagerService.getLocationManagers.bind(locationManagerService)
);
router.get(
  "/:id",
  locationManagerMiddleware.getLocationManager.bind(locationManagerMiddleware),
  locationManagerService.getLocationManager.bind(locationManagerService)
);
router.post(
  "/",
  locationManagerMiddleware.createLocationManager.bind(locationManagerMiddleware),
  locationManagerService.createLocationManager.bind(locationManagerService)
);
router.put(
  "/:id",
  locationManagerMiddleware.updateLocationManager.bind(locationManagerMiddleware),
  locationManagerService.updateLocationManager.bind(locationManagerService)
);
router.delete(
  "/:id",
  locationManagerMiddleware.deleteLocationManager.bind(locationManagerMiddleware),
  locationManagerService.deleteLocationManager.bind(locationManagerService)
);

export default router;
EOT

echo "LocationManager module generated successfully."