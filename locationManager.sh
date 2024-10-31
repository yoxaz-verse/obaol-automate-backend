#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display usage instructions
usage() {
  echo "Usage: ./setup_location_manager.sh"
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

# 1. Create LocationManager Interface
INTERFACE_FILE="$INTERFACES_DIR/locationManager.ts"
INTERFACE_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";
import { ILocation } from "./location";

export interface ILocationManager extends mongoose.Document {
  code: string;
  name: string;
  managingLocations: mongoose.Schema.Types.ObjectId[] | ILocation[];
}
EOL
)

create_or_overwrite_file "$INTERFACE_FILE" "$INTERFACE_CONTENT"

# 2. Create LocationManager Model
MODEL_FILE="$MODEL_DIR/locationManager.ts"
MODEL_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";
import { ILocationManager } from "../../interfaces/locationManager";

const LocationManagerSchema = new mongoose.Schema<ILocationManager>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    managingLocations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    ],
  },
  { timestamps: true }
);

export const LocationManagerModel = mongoose.model<ILocationManager>(
  "LocationManager",
  LocationManagerSchema
);
EOL
)

create_or_overwrite_file "$MODEL_FILE" "$MODEL_CONTENT"

# 3. Create LocationManager Repository
REPO_FILE="$REPO_DIR/locationManager.ts"
REPO_CONTENT=$(cat <<'EOL'
import { Request } from "express";
import { LocationManagerModel, ILocationManager } from "../models/locationManager";
import { logError } from "../../utils/errorLogger";

class LocationManagerRepository {
  public async getLocationManagers(req: Request): Promise<ILocationManager[]> {
    try {
      return await LocationManagerModel.find().exec();
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-getLocationManagers");
      throw error;
    }
  }

  public async getLocationManagerById(req: Request, id: string): Promise<ILocationManager | null> {
    try {
      return await LocationManagerModel.findById(id).exec();
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-getLocationManagerById");
      throw error;
    }
  }

  public async createLocationManager(req: Request, locationManagerData: ILocationManager): Promise<ILocationManager> {
    try {
      return await LocationManagerModel.create(locationManagerData);
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-createLocationManager");
      throw error;
    }
  }

  public async updateLocationManager(req: Request, id: string, locationManagerData: Partial<ILocationManager>): Promise<ILocationManager | null> {
    try {
      return await LocationManagerModel.findByIdAndUpdate(id, locationManagerData, { new: true }).exec();
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-updateLocationManager");
      throw error;
    }
  }

  public async deleteLocationManager(req: Request, id: string): Promise<ILocationManager | null> {
    try {
      return await LocationManagerModel.findByIdAndDelete(id).exec();
    } catch (error) {
      await logError(error, req, "LocationManagerRepository-deleteLocationManager");
      throw error;
    }
  }
}

export default LocationManagerRepository;
EOL
)

create_or_overwrite_file "$REPO_FILE" "$REPO_CONTENT"

# 4. Create LocationManager Service
SERVICE_FILE="$SERVICE_DIR/locationManager.ts"
SERVICE_CONTENT=$(cat <<'EOL'
import { Request, Response } from "express";
import LocationManagerRepository from "../database/repositories/locationManager";
import { logError } from "../utils/errorLogger";

class LocationManagerService {
  private locationManagerRepository: LocationManagerRepository;

  constructor() {
    this.locationManagerRepository = new LocationManagerRepository();
  }

  public async getLocationManagers(req: Request, res: Response) {
    try {
      const locationManagers = await this.locationManagerRepository.getLocationManagers(req);
      res.sendFormatted(locationManagers, "Location Managers retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationManagerService-getLocationManagers");
      res.sendError("Location Managers retrieval failed", 500);
    }
  }

  public async getLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationManager = await this.locationManagerRepository.getLocationManagerById(req, id);
      if (locationManager) {
        res.sendFormatted(locationManager, "Location Manager retrieved successfully", 200);
      } else {
        res.sendError("Location Manager not found", 404);
      }
    } catch (error) {
      await logError(error, req, "LocationManagerService-getLocationManager");
      res.sendError("Location Manager retrieval failed", 500);
    }
  }

  public async createLocationManager(req: Request, res: Response) {
    try {
      const locationManagerData = req.body;
      const newLocationManager = await this.locationManagerRepository.createLocationManager(req, locationManagerData);
      res.sendFormatted(newLocationManager, "Location Manager created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationManagerService-createLocationManager");
      res.sendError("Location Manager creation failed", 500);
    }
  }

  public async updateLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationManagerData = req.body;
      const updatedLocationManager = await this.locationManagerRepository.updateLocationManager(req, id, locationManagerData);
      if (updatedLocationManager) {
        res.sendFormatted(updatedLocationManager, "Location Manager updated successfully", 200);
      } else {
        res.sendError("Location Manager not found", 404);
      }
    } catch (error) {
      await logError(error, req, "LocationManagerService-updateLocationManager");
      res.sendError("Location Manager update failed", 500);
    }
  }

  public async deleteLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationManager = await this.locationManagerRepository.deleteLocationManager(req, id);
      if (deletedLocationManager) {
        res.sendFormatted(deletedLocationManager, "Location Manager deleted successfully", 200);
      } else {
        res.sendError("Location Manager not found", 404);
      }
    } catch (error) {
      await logError(error, req, "LocationManagerService-deleteLocationManager");
      res.sendError("Location Manager deletion failed", 500);
    }
  }
}

export default LocationManagerService;
EOL
)

create_or_overwrite_file "$SERVICE_FILE" "$SERVICE_CONTENT"

# 5. Create LocationManager Route
ROUTE_FILE="$ROUTES_DIR/locationManager.ts"
ROUTE_CONTENT=$(cat <<'EOL'
import { Router } from "express";
import LocationManagerService from "../services/locationManager";

const locationManagerRoute = Router();
const locationManagerService = new LocationManagerService();

locationManagerRoute.get("/", locationManagerService.getLocationManagers.bind(locationManagerService));
locationManagerRoute.get("/:id", locationManagerService.getLocationManager.bind(locationManagerService));
locationManagerRoute.post("/", locationManagerService.createLocationManager.bind(locationManagerService));
locationManagerRoute.patch("/:id", locationManagerService.updateLocationManager.bind(locationManagerService));
locationManagerRoute.delete("/:id", locationManagerService.deleteLocationManager.bind(locationManagerService));

export default locationManagerRoute;
EOL
)

create_or_overwrite_file "$ROUTE_FILE" "$ROUTE_CONTENT"

# 6. Integrate LocationManager Routes into Main Router
MAIN_ROUTE_FILE="$ROUTES_DIR/index.ts"

if [ ! -f "$MAIN_ROUTE_FILE" ]; then
  MAIN_ROUTE_CONTENT=$(cat <<'EOL'
import { Router } from "express";
import locationManagerRoute from "./locationManager";

const router = Router();

router.use("/location-managers", locationManagerRoute);

export default router;
EOL
)
  create_or_overwrite_file "$MAIN_ROUTE_FILE" "$MAIN_ROUTE_CONTENT"
else
  echo "🔄 Main route file already exists. Adding LocationManager route."
  sed -i '/^const router = Router()/a router.use("/location-managers", locationManagerRoute);' "$MAIN_ROUTE_FILE"
fi

echo "🎉 Setup complete for LocationManager model, interface, repository, service, and route."
