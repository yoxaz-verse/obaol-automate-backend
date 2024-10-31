#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to create directories if they don't exist
create_dir() {
  mkdir -p "$1"
}

# Function to create files with content
create_file() {
  local path=$1
  shift
  cat <<EOT > "$path"
$*
EOT
}

# Create Model
create_dir src/database/models
create_file src/database/models/location.ts \
"import mongoose from \"mongoose\";
import { ILocationType } from \"../interfaces/locationType\";
import { ILocationManager } from \"../interfaces/locationManager\";

export interface ILocation extends mongoose.Document {
  name: string;
  address: string;
  city: string;
  description?: string;
  image: string;
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: mongoose.Schema.Types.ObjectId;
  province: string;
  region: string;
  locationType: mongoose.Schema.Types.ObjectId | ILocationType;
  locationManagers: mongoose.Schema.Types.ObjectId[] | ILocationManager[];
}

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String },
    image: { type: String, required: true },
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    map: { type: String, required: true },
    nation: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: \"Owner\", required: true },
    province: { type: String, required: true },
    region: { type: String, required: true },
    locationType: { type: mongoose.Schema.Types.ObjectId, ref: \"LocationType\", required: true },
    locationManagers: [{ type: mongoose.Schema.Types.ObjectId, ref: \"LocationManager\" }],
  },
  { timestamps: true }
);

export const LocationModel = mongoose.model<ILocation>(\"Location\", LocationSchema);
"

# Create Repository
create_dir src/database/repositories
create_file src/database/repositories/location.ts \
"import { Request } from \"express\";
import { LocationModel } from \"../models/location\";
import {
  ILocation,
  ICreateLocation,
  IUpdateLocation,
} from \"../../interfaces/location\";
import { logError } from \"../../utils/errorLogger\";
import { IPagination } from \"../../interfaces/pagination\";

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
        query.name = { \$regex: search, \$options: \"i\" };
      }

      const locationsDoc = await LocationModel.find(query)
        .populate(\"owner\", \"name email\") // Adjust fields as needed
        .populate(\"locationType\", \"name\") // Adjust fields as needed
        .populate(\"locationManagers\", \"code name\") // Adjust fields as needed
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const locations = locationsDoc.map((doc) => doc.toObject() as ILocation);

      const totalCount = await LocationModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: locations,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, \"LocationRepository-getLocations\");
      throw error;
    }
  }

  public async getLocationById(req: Request, id: string): Promise<ILocation> {
    try {
      const locationDoc = await LocationModel.findById(id)
        .populate(\"owner\", \"name email\") // Adjust fields as needed
        .populate(\"locationType\", \"name\") // Adjust fields as needed
        .populate(\"locationManagers\", \"code name\"); // Adjust fields as needed

      if (!locationDoc) {
        throw new Error(\"Location not found\");
      }

      return locationDoc.toObject() as ILocation;
    } catch (error) {
      await logError(error, req, \"LocationRepository-getLocationById\");
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
      await logError(error, req, \"LocationRepository-createLocation\");
      throw error;
    }
  }

  public async updateLocation(
    req: Request,
    id: string,
    locationData: Partial<IUpdateLocation>
  ): Promise<ILocation> {
    try {
      const updatedLocation = await LocationModel.findByIdAndUpdate(
        id,
        locationData,
        { new: true }
      )
        .populate(\"owner\", \"name email\") // Adjust fields as needed
        .populate(\"locationType\", \"name\") // Adjust fields as needed
        .populate(\"locationManagers\", \"code name\"); // Adjust fields as needed
      if (!updatedLocation) {
        throw new Error(\"Failed to update Location\");
      }
      return updatedLocation.toObject();
    } catch (error) {
      await logError(error, req, \"LocationRepository-updateLocation\");
      throw error;
    }
  }

  public async deleteLocation(req: Request, id: string): Promise<ILocation> {
    try {
      const deletedLocation = await LocationModel.findByIdAndDelete(id)
        .populate(\"owner\", \"name email\") // Adjust fields as needed
        .populate(\"locationType\", \"name\") // Adjust fields as needed
        .populate(\"locationManagers\", \"code name\"); // Adjust fields as needed
      if (!deletedLocation) {
        throw new Error(\"Failed to delete Location\");
      }
      return deletedLocation.toObject();
    } catch (error) {
      await logError(error, req, \"LocationRepository-deleteLocation\");
      throw error;
    }
  }
}

export default LocationRepository;
"

# Create Service
create_dir src/services
create_file src/services/location.ts \
"import { Request, Response } from \"express\";
import LocationRepository from \"../database/repositories/location\";
import { logError } from \"../utils/errorLogger\";
import { paginationHandler } from \"../utils/paginationHandler\";
import { searchHandler } from \"../utils/searchHandler\";

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
      res.sendArrayFormatted(locations, \"Locations retrieved successfully\");
    } catch (error) {
      await logError(error, req, \"LocationService-getLocations\");
      res.sendError(error, \"Locations retrieval failed\");
    }
  }

  public async getLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await this.locationRepository.getLocationById(req, id);
      res.sendFormatted(location, \"Location retrieved successfully\");
    } catch (error) {
      await logError(error, req, \"LocationService-getLocation\");
      res.sendError(error, \"Location retrieval failed\");
    }
  }

  public async createLocation(req: Request, res: Response) {
    try {
      const locationData = req.body;
      const newLocation = await this.locationRepository.createLocation(req, locationData);
      res.sendFormatted(newLocation, \"Location created successfully\", 201);
    } catch (error) {
      await logError(error, req, \"LocationService-createLocation\");
      res.sendError(error, \"Location creation failed\");
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
      res.sendFormatted(updatedLocation, \"Location updated successfully\");
    } catch (error) {
      await logError(error, req, \"LocationService-updateLocation\");
      res.sendError(error, \"Location update failed\");
    }
  }

  public async deleteLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocation = await this.locationRepository.deleteLocation(req, id);
      res.sendFormatted(deletedLocation, \"Location deleted successfully\");
    } catch (error) {
      await logError(error, req, \"LocationService-deleteLocation\");
      res.sendError(error, \"Location deletion failed\");
    }
  }
}

export default LocationService;
"

# Create Middleware
create_dir src/middlewares
create_file src/middlewares/location.ts \
"import { Request, Response, NextFunction } from \"express\";
import { logError } from \"../utils/errorLogger\";

class LocationMiddleware {
  public async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        address,
        city,
        image,
        latitude,
        longitude,
        map,
        nation,
        owner,
        province,
        region,
        locationType,
      } = req.body;
      if (
        !name ||
        !address ||
        !city ||
        !image ||
        !latitude ||
        !longitude ||
        !map ||
        !nation ||
        !owner ||
        !province ||
        !region ||
        !locationType
      ) {
        res.sendError(
          \"ValidationError: All required fields must be provided\",
          \"Missing required fields\",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, \"Middleware-LocationCreate\");
      res.sendError(error, \"An unexpected error occurred\", 500);
    }
  }

  public async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        address,
        city,
        image,
        latitude,
        longitude,
        map,
        nation,
        owner,
        province,
        region,
        locationType,
        managingLocations,
      } = req.body;
      if (
        !name &&
        !address &&
        !city &&
        !image &&
        !latitude &&
        !longitude &&
        !map &&
        !nation &&
        !owner &&
        !province &&
        !region &&
        !locationType &&
        !managingLocations
      ) {
        res.sendError(
          \"ValidationError: At least one field must be provided for update\",
          \"No fields provided\",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, \"Middleware-LocationUpdate\");
      res.sendError(error, \"An unexpected error occurred\", 500);
    }
  }

  public async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          \"ValidationError: ID must be provided\",
          \"ID must be provided\",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, \"Middleware-LocationDelete\");
      res.sendError(error, \"An unexpected error occurred\", 500);
    }
  }

  public async getLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          \"ValidationError: ID must be provided\",
          \"ID must be provided\",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, \"Middleware-LocationGet\");
      res.sendError(error, \"An unexpected error occurred\", 500);
    }
  }
}

export default LocationMiddleware;
"

# Create Interface
create_dir src/interfaces
create_file src/interfaces/location.ts \
"import mongoose from \"mongoose\";
import { ILocationType } from \"./locationType\";
import { ILocationManager } from \"./locationManager\";

export interface ILocation {
  name: string;
  address: string;
  city: string;
  description?: string;
  image: string;
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: string; // Assuming owner is referenced by ID as string
  province: string;
  region: string;
  locationType: string; // Assuming locationType is referenced by ID as string
  locationManagers?: string[]; // Optional array of LocationManager IDs
}

export interface ICreateLocation {
  name: string;
  address: string;
  city: string;
  description?: string;
  image: string;
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: string;
  province: string;
  region: string;
  locationType: string;
  locationManagers?: string[];
}

export interface IUpdateLocation {
  name?: string;
  address?: string;
  city?: string;
  description?: string;
  image?: string;
  latitude?: string;
  longitude?: string;
  map?: string;
  nation?: string;
  owner?: string;
  province?: string;
  region?: string;
  locationType?: string;
  locationManagers?: string[];
}
"

# Create Routes
create_dir src/routes
create_file src/routes/locationRoute.ts \
"import { Router } from \"express\";
import LocationService from \"../services/location\";
import LocationMiddleware from \"../middlewares/location\";

const locationRoute = Router();
const locationService = new LocationService();
const locationMiddleware = new LocationMiddleware();

locationRoute.get(\"/\", locationService.getLocations.bind(locationService));
locationRoute.get(
  \"/:id\",
  locationMiddleware.getLocation.bind(locationMiddleware),
  locationService.getLocation.bind(locationService)
);
locationRoute.post(
  \"/\",
  locationMiddleware.createLocation.bind(locationMiddleware),
  locationService.createLocation.bind(locationService)
);
locationRoute.patch(
  \"/:id\",
  locationMiddleware.updateLocation.bind(locationMiddleware),
  locationService.updateLocation.bind(locationService)
);
locationRoute.delete(
  \"/:id\",
  locationMiddleware.deleteLocation.bind(locationMiddleware),
  locationService.deleteLocation.bind(locationService)
);

export default locationRoute;
"

# Completion Message
echo "Location module generated successfully."
