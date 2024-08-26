#!/bin/bash

# Create model
cat <<EOT > src/database/models/locationType.ts
import mongoose from "mongoose";

interface ILocationType extends mongoose.Document {
  name: string;
}

const LocationTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const LocationTypeModel = mongoose.model<ILocationType>("LocationType", LocationTypeSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/locationType.ts
import { Request } from "express";
import { LocationTypeModel } from "../models/locationType";
import { ILocationType, ICreateLocationType, IUpdateLocationType } from "../../interfaces/locationType";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class LocationTypeRepository {
  public async getLocationTypes(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ILocationType[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const locationTypes = await LocationTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await LocationTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: locationTypes,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypes");
      throw error;
    }
  }

  public async getLocationTypeById(req: Request, id: string): Promise<ILocationType> {
    try {
      const locationType = await LocationTypeModel.findById(id).lean();
      if (!locationType) {
        throw new Error("Location Type not found");
      }
      return locationType;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypeById");
      throw error;
    }
  }

  public async createLocationType(
    req: Request,
    locationTypeData: ICreateLocationType
  ): Promise<ILocationType> {
    try {
      const newLocationType = await LocationTypeModel.create(locationTypeData);
      return newLocationType.toObject();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-createLocationType");
      throw error;
    }
  }

  public async updateLocationType(
    req: Request,
    id: string,
    locationTypeData: Partial<IUpdateLocationType>
  ): Promise<ILocationType> {
    try {
      const updatedLocationType = await LocationTypeModel.findByIdAndUpdate(id, locationTypeData, {
        new: true,
      });
      if (!updatedLocationType) {
        throw new Error("Failed to update Location Type");
      }
      return updatedLocationType.toObject();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-updateLocationType");
      throw error;
    }
  }

  public async deleteLocationType(req: Request, id: string): Promise<ILocationType> {
    try {
      const deletedLocationType = await LocationTypeModel.findByIdAndDelete(id);
      if (!deletedLocationType) {
        throw new Error("Failed to delete Location Type");
      }
      return deletedLocationType.toObject();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-deleteLocationType");
      throw error;
    }
  }
}

export default LocationTypeRepository;
EOT

# Create service
cat <<EOT > src/services/locationType.ts
import { Request, Response } from "express";
import LocationTypeRepository from "../database/repositories/locationType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class LocationTypeService {
  private locationTypeRepository: LocationTypeRepository;

  constructor() {
    this.locationTypeRepository = new LocationTypeRepository();
  }

  public async getLocationTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locationTypes = await this.locationTypeRepository.getLocationTypes(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(locationTypes, "Location Types retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationTypes");
      res.sendError(error, "Location Types retrieval failed");
    }
  }

  public async getLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationType = await this.locationTypeRepository.getLocationTypeById(req, id);
      res.sendFormatted(locationType, "Location Type retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationType");
      res.sendError(error, "Location Type retrieval failed");
    }
  }

  public async createLocationType(req: Request, res: Response) {
    try {
      const locationTypeData = req.body;
      const newLocationType = await this.locationTypeRepository.createLocationType(req, locationTypeData);
      res.sendFormatted(newLocationType, "Location Type created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationTypeService-createLocationType");
      res.sendError(error, "Location Type creation failed");
    }
  }

  public async updateLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationTypeData = req.body;
      const updatedLocationType = await this.locationTypeRepository.updateLocationType(
        req,
        id,
        locationTypeData
      );
      res.sendFormatted(updatedLocationType, "Location Type updated successfully");
    } catch (error) {
      await logError(error, req, "LocationTypeService-updateLocationType");
      res.sendError(error, "Location Type update failed");
    }
  }

  public async deleteLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationType = await this.locationTypeRepository.deleteLocationType(req, id);
      res.sendFormatted(deletedLocationType, "Location Type deleted successfully");
    } catch (error) {
      await logError(error, req, "LocationTypeService-deleteLocationType");
      res.sendError(error, "Location Type deletion failed");
    }
  }
}

export default LocationTypeService;
EOT

# Create middleware
cat <<EOT > src/middlewares/locationType.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class LocationTypeMiddleware {
  public async createLocationType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationTypeCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateLocationType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError(
          "ValidationError: Name must be provided",
          "Name must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-LocationTypeUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteLocationType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationTypeDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getLocationType(req: Request, res: Response, next: NextFunction) {
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
      await logError(error, req, "Middleware-LocationTypeGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default LocationTypeMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/locationType.ts
export interface ILocationType {
  _id: string;
  name: string;
}

export interface ICreateLocationType {
  name: string;
}

export interface IUpdateLocationType {
  name?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/locationTypeRoute.ts
import { Router } from "express";
import LocationTypeService from "../services/locationType";
import LocationTypeMiddleware from "../middlewares/locationType";

const router = Router();
const locationTypeService = new LocationTypeService();
const locationTypeMiddleware = new LocationTypeMiddleware();

router.get(
  "/",
  locationTypeMiddleware.getLocationType.bind(locationTypeMiddleware),
  locationTypeService.getLocationTypes.bind(locationTypeService)
);
router.get(
  "/:id",
  locationTypeMiddleware.getLocationType.bind(locationTypeMiddleware),
  locationTypeService.getLocationType.bind(locationTypeService)
);
router.post(
  "/",
  locationTypeMiddleware.createLocationType.bind(locationTypeMiddleware),
  locationTypeService.createLocationType.bind(locationTypeService)
);
router.put(
  "/:id",
  locationTypeMiddleware.updateLocationType.bind(locationTypeMiddleware),
  locationTypeService.updateLocationType.bind(locationTypeService)
);
router.delete(
  "/:id",
  locationTypeMiddleware.deleteLocationType.bind(locationTypeMiddleware),
  locationTypeService.deleteLocationType.bind(locationTypeService)
);

export default router;
EOT

echo "LocationType module generated successfully."