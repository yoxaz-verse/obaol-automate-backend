#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display usage instructions
usage() {
  echo "Usage: ./setup_location_type.sh"
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

# 1. Create LocationType Interface
INTERFACE_FILE="$INTERFACES_DIR/locationType.ts"
INTERFACE_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";

export interface ILocationType extends mongoose.Document {
  name: string;
}
EOL
)

create_or_overwrite_file "$INTERFACE_FILE" "$INTERFACE_CONTENT"

# 2. Create LocationType Model
MODEL_FILE="$MODEL_DIR/locationType.ts"
MODEL_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";
import { ILocationType } from "../../interfaces/locationType";

const LocationTypeSchema = new mongoose.Schema<ILocationType>(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const LocationTypeModel = mongoose.model<ILocationType>("LocationType", LocationTypeSchema);
EOL
)

create_or_overwrite_file "$MODEL_FILE" "$MODEL_CONTENT"

# 3. Create LocationType Repository
REPO_FILE="$REPO_DIR/locationType.ts"
REPO_CONTENT=$(cat <<'EOL'
import { Request } from "express";
import { LocationTypeModel, ILocationType } from "../models/locationType";
import { logError } from "../../utils/errorLogger";

class LocationTypeRepository {
  public async getLocationTypes(req: Request): Promise<ILocationType[]> {
    try {
      return await LocationTypeModel.find().exec();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypes");
      throw error;
    }
  }

  public async getLocationTypeById(req: Request, id: string): Promise<ILocationType | null> {
    try {
      return await LocationTypeModel.findById(id).exec();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypeById");
      throw error;
    }
  }

  public async createLocationType(req: Request, locationTypeData: ILocationType): Promise<ILocationType> {
    try {
      return await LocationTypeModel.create(locationTypeData);
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-createLocationType");
      throw error;
    }
  }

  public async updateLocationType(req: Request, id: string, locationTypeData: Partial<ILocationType>): Promise<ILocationType | null> {
    try {
      return await LocationTypeModel.findByIdAndUpdate(id, locationTypeData, { new: true }).exec();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-updateLocationType");
      throw error;
    }
  }

  public async deleteLocationType(req: Request, id: string): Promise<ILocationType | null> {
    try {
      return await LocationTypeModel.findByIdAndDelete(id).exec();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-deleteLocationType");
      throw error;
    }
  }
}

export default LocationTypeRepository;
EOL
)

create_or_overwrite_file "$REPO_FILE" "$REPO_CONTENT"

# 4. Create LocationType Service
SERVICE_FILE="$SERVICE_DIR/locationType.ts"
SERVICE_CONTENT=$(cat <<'EOL'
import { Request, Response } from "express";
import LocationTypeRepository from "../database/repositories/locationType";
import { logError } from "../utils/errorLogger";

class LocationTypeService {
  private locationTypeRepository: LocationTypeRepository;

  constructor() {
    this.locationTypeRepository = new LocationTypeRepository();
  }

  public async getLocationTypes(req: Request, res: Response) {
    try {
      const locationTypes = await this.locationTypeRepository.getLocationTypes(req);
      res.sendFormatted(locationTypes, "Location Types retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationTypes");
      res.sendError("Location Types retrieval failed", 500);
    }
  }

  public async getLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationType = await this.locationTypeRepository.getLocationTypeById(req, id);
      if (locationType) {
        res.sendFormatted(locationType, "Location Type retrieved successfully", 200);
      } else {
        res.sendError("Location Type not found", 404);
      }
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationType");
      res.sendError("Location Type retrieval failed", 500);
    }
  }

  public async createLocationType(req: Request, res: Response) {
    try {
      const locationTypeData = req.body;
      const newLocationType = await this.locationTypeRepository.createLocationType(req, locationTypeData);
      res.sendFormatted(newLocationType, "Location Type created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationTypeService-createLocationType");
      res.sendError("Location Type creation failed", 500);
    }
  }

  public async updateLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationTypeData = req.body;
      const updatedLocationType = await this.locationTypeRepository.updateLocationType(req, id, locationTypeData);
      if (updatedLocationType) {
        res.sendFormatted(updatedLocationType, "Location Type updated successfully", 200);
      } else {
        res.sendError("Location Type not found", 404);
      }
    } catch (error) {
      await logError(error, req, "LocationTypeService-updateLocationType");
      res.sendError("Location Type update failed", 500);
    }
  }

  public async deleteLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationType = await this.locationTypeRepository.deleteLocationType(req, id);
      if (deletedLocationType) {
        res.sendFormatted(deletedLocationType, "Location Type deleted successfully", 200);
      } else {
        res.sendError("Location Type not found", 404);
      }
    } catch (error) {
      await logError(error, req, "LocationTypeService-deleteLocationType");
      res.sendError("Location Type deletion failed", 500);
    }
  }
}

export default LocationTypeService;
EOL
)

create_or_overwrite_file "$SERVICE_FILE" "$SERVICE_CONTENT"

# 5. Create LocationType Route
ROUTE_FILE="$ROUTES_DIR/locationType.ts"
ROUTE_CONTENT=$(cat <<'EOL'
import { Router } from "express";
import LocationTypeService from "../services/locationType";

const locationTypeRoute = Router();
const locationTypeService = new LocationTypeService();

locationTypeRoute.get("/", locationTypeService.getLocationTypes.bind(locationTypeService));
locationTypeRoute.get("/:id", locationTypeService.getLocationType.bind(locationTypeService));
locationTypeRoute.post("/", locationTypeService.createLocationType.bind(locationTypeService));
locationTypeRoute.patch("/:id", locationTypeService.updateLocationType.bind(locationTypeService));
locationTypeRoute.delete("/:id", locationTypeService.deleteLocationType.bind(locationTypeService));

export default locationTypeRoute;
EOL
)



echo "🎉 Setup complete for LocationType model, interface, repository, service, and route."
