#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display usage instructions
usage() {
  echo "Usage: ./setup_location.sh"
  exit 1
}

# Check if script is run from the project root by looking for package.json
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Please run this script from the project root."
  usage
fi

echo "✅ Project root confirmed."

# Define directories
SRC_DIR="src"
MODEL_DIR="$SRC_DIR/database/models"
REPO_DIR="$SRC_DIR/database/repositories"
SERVICE_DIR="$SRC_DIR/services"
MIDDLEWARE_DIR="$SRC_DIR/middlewares"
ROUTES_DIR="$SRC_DIR/routes"
INTERFACES_DIR="$SRC_DIR/interfaces"
UTILS_DIR="$SRC_DIR/utils"
TYPES_DIR="$SRC_DIR/types"

# Create directories if they don't exist
echo "🗂️ Creating necessary directories..."
mkdir -p "$MODEL_DIR" "$REPO_DIR" "$SERVICE_DIR" "$MIDDLEWARE_DIR" "$ROUTES_DIR" "$INTERFACES_DIR" "$UTILS_DIR" "$TYPES_DIR"

# Function to create or overwrite a file with content
create_or_overwrite_file() {
  local FILE_PATH=$1
  local CONTENT=$2

  if [ -f "$FILE_PATH" ]; then
    echo "📝 Overwriting existing file at $FILE_PATH."
  else
    echo "📝 Creating file at $FILE_PATH."
  fi

  echo "$CONTENT" > "$FILE_PATH"
  echo "✅ $FILE_PATH has been set up."
}

# 1. Create Location Interface
INTERFACE_FILE="$INTERFACES_DIR/location.ts"
INTERFACE_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";
import { ILocationType } from "./locationType";

export interface ILocation extends mongoose.Document {
  name: string;
  address: string;
  city: string;
  description?: string;
  fileId: string; // Identifier for the uploaded file
  fileURL?: string; // URL to access the uploaded file (optional)
  latitude: string;
  longitude: string;
  map: string;
  nation: string;
  owner: mongoose.Schema.Types.ObjectId;
  province: string;
  region: string;
  locationType: mongoose.Schema.Types.ObjectId | ILocationType;
  isNearAnotherLocation: boolean;
}
EOL
)

create_or_overwrite_file "$INTERFACE_FILE" "$INTERFACE_CONTENT"

# 2. Create Location Model
MODEL_FILE="$MODEL_DIR/location.ts"
MODEL_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";
import { ILocation } from "../../interfaces/location";

const LocationSchema = new mongoose.Schema<ILocation>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String },
    isNearAnotherLocation: { type: Boolean, default: false },
    fileId: { type: String }, // Identifier for the uploaded file
    fileURL: { type: String }, // URL to access the uploaded file (optional)
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    map: { type: String, required: true },
    nation: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
    province: { type: String, required: true },
    region: { type: String, required: true },
    locationType: { type: mongoose.Schema.Types.ObjectId, ref: "LocationType", required: true },
  },
  { timestamps: true }
);

export const LocationModel = mongoose.model<ILocation>("Location", LocationSchema);
EOL
)

create_or_overwrite_file "$MODEL_FILE" "$MODEL_CONTENT"

# 3. Create Location Repository
REPO_FILE="$REPO_DIR/location.ts"
REPO_CONTENT=$(cat <<'EOL'
import { Request } from "express";
import { LocationModel, ILocation } from "../models/location";
import { logError } from "../../utils/errorLogger";

class LocationRepository {
  public async getLocations(req: Request, pagination: { page: number; limit: number }, search: string): Promise<{ data: ILocation[]; totalCount: number; currentPage: number; totalPages: number }> {
    try {
      const query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await LocationModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const locations = await LocationModel.find(query)
        .populate("locationType", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: locations, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocations");
      throw error;
    }
  }

  public async getLocationById(req: Request, id: string): Promise<ILocation> {
    try {
      const location = await LocationModel.findById(id).populate("locationType", "name");
      if (!location) {
        throw new Error("Location not found");
      }
      return location;
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocationById");
      throw error;
    }
  }

  public async createLocation(req: Request, locationData: Partial<ILocation>): Promise<ILocation> {
    try {
      const newLocation = await LocationModel.create(locationData);
      return newLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-createLocation");
      throw error;
    }
  }

  public async updateLocation(req: Request, id: string, locationData: Partial<ILocation>): Promise<ILocation> {
    try {
      const updatedLocation = await LocationModel.findByIdAndUpdate(id, locationData, { new: true }).populate("locationType", "name");
      if (!updatedLocation) {
        throw new Error("Failed to update location");
      }
      return updatedLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-updateLocation");
      throw error;
    }
  }

  public async deleteLocation(req: Request, id: string): Promise<ILocation> {
    try {
      const deletedLocation = await LocationModel.findByIdAndDelete(id).populate("locationType", "name");
      if (!deletedLocation) {
        throw new Error("Failed to delete location");
      }
      return deletedLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-deleteLocation");
      throw error;
    }
  }
}

export default LocationRepository;
EOL
)

create_or_overwrite_file "$REPO_FILE" "$REPO_CONTENT"

# 4. Create Location Service
SERVICE_FILE="$SERVICE_DIR/location.ts"
SERVICE_CONTENT=$(cat <<'EOL'
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
      const locations = await this.locationRepository.getLocations(req, pagination, search);
      res.sendArrayFormatted(
        locations.data,
        "Locations retrieved successfully",
        200,
        locations.totalCount,
        locations.currentPage,
        locations.totalPages
      );
    } catch (error) {
      await logError(error, req, "LocationService-getLocations");
      res.sendError("Locations retrieval failed", 500);
    }
  }

  public async getLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await this.locationRepository.getLocationById(req, id);
      res.sendFormatted(location, "Location retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-getLocation");
      res.sendError("Location retrieval failed", 500);
    }
  }

  public async createLocation(req: Request, res: Response) {
    try {
      const locationData = req.body;

      // Integrate fileId and fileURL received from another API
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        locationData.fileId = fileId;
        locationData.fileURL = fileURL;
      } else {
        res.sendError("fileId and fileURL must be provided", 400);
        return;
      }

      const newLocation = await this.locationRepository.createLocation(req, locationData);
      res.sendFormatted(newLocation, "Location created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationService-createLocation");
      res.sendError("Location creation failed", 500);
    }
  }

  public async updateLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationData = req.body;
      const updatedLocation = await this.locationRepository.updateLocation(req, id, locationData);
      res.sendFormatted(updatedLocation, "Location updated successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-updateLocation");
      res.sendError("Location update failed", 500);
    }
  }

  public async deleteLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocation = await this.locationRepository.deleteLocation(req, id);
      res.sendFormatted(deletedLocation, "Location deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-deleteLocation");
      res.sendError("Location deletion failed", 500);
    }
  }
}

export default LocationService;
EOL
)

create_or_overwrite_file "$SERVICE_FILE" "$SERVICE_CONTENT"

# 5. Create Location Routes
ROUTE_FILE="$ROUTES_DIR/location.ts"
ROUTE_CONTENT=$(cat <<'EOL'
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
EOL
)

create_or_overwrite_file "$ROUTE_FILE" "$ROUTE_CONTENT"

echo "🚀 Location module setup complete!"
