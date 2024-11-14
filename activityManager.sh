#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display usage instructions
usage() {
  echo "Usage: ./setup_activity_manager.sh"
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

# 1. Create ActivityManager Interface
INTERFACE_FILE="$INTERFACES_DIR/activityManager.ts"
INTERFACE_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";

export interface IActivityManager {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId; // Link to Admin
  activityId?: string; // Unique identifier for the activity
  activityURL?: string; // URL to access the activity
  role: string; // Role of the activity manager
}

export interface ICreateActivityManager {
  email: string;
  name: string;
  password: string;
  admin: mongoose.Types.ObjectId; // Assuming admin is referenced by ObjectId
  activityId: string;
  activityURL: string;
}

export interface IUpdateActivityManager {
  email?: string;
  name?: string;
  password?: string;
  admin?: mongoose.Types.ObjectId;
  activityId?: string;
  activityURL?: string;
  isActive?: boolean;
}
EOL
)

create_or_overwrite_file "$INTERFACE_FILE" "$INTERFACE_CONTENT"

# 2. Create ActivityManager Model
MODEL_FILE="$MODEL_DIR/activityManager.ts"
MODEL_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";
import { IActivityManager } from "../../interfaces/activityManager";

const ActivityManagerSchema = new mongoose.Schema<IActivityManager>(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Linking to Admin
    activityId: { type: String }, // Identifier for the activity
    activityURL: { type: String }, // URL to access the activity (optional)
    role: { type: String, default: "activityManager" }, // Assign default role
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
/*
import bcrypt from "bcrypt";

ActivityManagerSchema.pre<IActivityManager>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
*/

export const ActivityManagerModel = mongoose.model<IActivityManager>("ActivityManager", ActivityManagerSchema);
EOL
)

create_or_overwrite_file "$MODEL_FILE" "$MODEL_CONTENT"

# 3. Create ActivityManager Repository
REPO_FILE="$REPO_DIR/activityManager.ts"
REPO_CONTENT=$(cat <<'EOL'
import { Request } from "express";
import { ActivityManagerModel } from "../models/activityManager";
import { ICreateActivityManager, IUpdateActivityManager } from "../../interfaces/activityManager";
import { logError } from "../../utils/errorLogger";
import { IActivityManager } from "../../interfaces/activityManager";

class ActivityManagerRepository {
  public async getActivityManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IActivityManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ActivityManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const activityManagers = await ActivityManagerModel.find(query)
        .populate("admin", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: activityManagers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-getActivityManagers");
      throw error;
    }
  }

  public async getActivityManagerById(req: Request, id: string): Promise<IActivityManager> {
    try {
      const activityManagerDoc = await ActivityManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "name");

      if (!activityManagerDoc) {
        throw new Error("ActivityManager not found");
      }

      return activityManagerDoc;
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-getActivityManagerById");
      throw error;
    }
  }

  public async createActivityManager(
    req: Request,
    activityManagerData: ICreateActivityManager
  ): Promise<IActivityManager> {
    try {
      const newActivityManager = await ActivityManagerModel.create(activityManagerData);
      return newActivityManager;
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-createActivityManager");
      throw error;
    }
  }

  public async updateActivityManager(
    req: Request,
    id: string,
    activityManagerData: Partial<IUpdateActivityManager>
  ): Promise<IActivityManager> {
    try {
      const updatedActivityManager = await ActivityManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        activityManagerData,
        { new: true }
      ).populate("admin", "name");
      if (!updatedActivityManager) {
        throw new Error("Failed to update ActivityManager");
      }
      return updatedActivityManager;
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-updateActivityManager");
      throw error;
    }
  }

  public async deleteActivityManager(req: Request, id: string): Promise<IActivityManager> {
    try {
      const deletedActivityManager = await ActivityManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "name");
      if (!deletedActivityManager) {
        throw new Error("Failed to delete ActivityManager");
      }
      return deletedActivityManager;
    } catch (error) {
      await logError(error, req, "ActivityManagerRepository-deleteActivityManager");
      throw error;
    }
  }
}

export default ActivityManagerRepository;
EOL
)

create_or_overwrite_file "$REPO_FILE" "$REPO_CONTENT"

# 4. Create ActivityManager Service
SERVICE_FILE="$SERVICE_DIR/activityManager.ts"
SERVICE_CONTENT=$(cat <<'EOL'
// src/services/activityManager.ts

import { Request, Response } from "express";
import ActivityManagerRepository from "../database/repositories/activityManager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ActivityManagerService {
  private activityManagerRepository: ActivityManagerRepository;

  constructor() {
    this.activityManagerRepository = new ActivityManagerRepository();
  }

  public async getActivityManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const activityManagers = await this.activityManagerRepository.getActivityManagers(
        req,
        pagination,
        search
      );
      res.json(activityManagers);
    } catch (error) {
      await logError(error, req, "ActivityManagerService-getActivityManagers");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async getActivityManagerById(req: Request, res: Response) {
    try {
      const activityManager = await this.activityManagerRepository.getActivityManagerById(req, req.params.id);
      res.json(activityManager);
    } catch (error) {
      await logError(error, req, "ActivityManagerService-getActivityManagerById");
      res.status(404).json({ error: error.message });
    }
  }

  public async createActivityManager(req: Request, res: Response) {
    try {
      const newActivityManager = await this.activityManagerRepository.createActivityManager(req, req.body);
      res.status(201).json(newActivityManager);
    } catch (error) {
      await logError(error, req, "ActivityManagerService-createActivityManager");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async updateActivityManager(req: Request, res: Response) {
    try {
      const updatedActivityManager = await this.activityManagerRepository.updateActivityManager(
        req,
        req.params.id,
        req.body
      );
      res.json(updatedActivityManager);
    } catch (error) {
      await logError(error, req, "ActivityManagerService-updateActivityManager");
      res.status(404).json({ error: error.message });
    }
  }

  public async deleteActivityManager(req: Request, res: Response) {
    try {
      const deletedActivityManager = await this.activityManagerRepository.deleteActivityManager(req, req.params.id);
      res.json(deletedActivityManager);
    } catch (error) {
      await logError(error, req, "ActivityManagerService-deleteActivityManager");
      res.status(404).json({ error: error.message });
    }
  }
}

export default ActivityManagerService;
EOL
)

create_or_overwrite_file "$SERVICE_FILE" "$SERVICE_CONTENT"

# 5. Create ActivityManager Middleware (optional)
MIDDLEWARE_FILE="$MIDDLEWARE_DIR/activityManager.ts"
MIDDLEWARE_CONTENT=$(cat <<'EOL'
// src/middlewares/activityManager.ts

import { Request, Response, NextFunction } from "express";

export const validateActivityManager = (req: Request, res: Response, next: NextFunction) => {
  // Add your validation logic here
  // Example: Check if required fields are provided
  const { email, name, password, admin } = req.body;
  if (!email || !name || !password || !admin) {
    return res.status(400).json({ error: "All fields are required." });
  }
  next();
};
EOL
)

create_or_overwrite_file "$MIDDLEWARE_FILE" "$MIDDLEWARE_CONTENT"

# 6. Create ActivityManager Routes
ROUTE_FILE="$ROUTES_DIR/activityManager.ts"
ROUTE_CONTENT=$(cat <<'EOL'
// src/routes/activityManager.ts

import { Router } from "express";
import ActivityManagerService from "../services/activityManager";
import { validateActivityManager } from "../middlewares/activityManager";

const router = Router();
const activityManagerService = new ActivityManagerService();

router.get("/", activityManagerService.getActivityManagers.bind(activityManagerService));
router.get("/:id", activityManagerService.getActivityManagerById.bind(activityManagerService));
router.post("/", validateActivityManager, activityManagerService.createActivityManager.bind(activityManagerService));
router.put("/:id", validateActivityManager, activityManagerService.updateActivityManager.bind(activityManagerService));
router.delete("/:id", activityManagerService.deleteActivityManager.bind(activityManagerService));

export default router;
EOL
)

create_or_overwrite_file "$ROUTE_FILE" "$ROUTE_CONTENT"

echo "🎉 ActivityManager setup completed successfully!"
