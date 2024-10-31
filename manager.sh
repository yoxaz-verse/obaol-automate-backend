#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display usage instructions
usage() {
  echo "Usage: ./setup_manager.sh"
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

# 1. Create Manager Interface
INTERFACE_FILE="$INTERFACES_DIR/manager.ts"
INTERFACE_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";

export interface IManager extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
  admin: mongoose.Schema.Types.ObjectId;  // Link to Admin
  fileId: string;                          // Unique identifier for the uploaded file
  fileURL?: string;                        // URL to access the uploaded file
  role: string;                            // Role of the manager
}
EOL
)

create_or_overwrite_file "$INTERFACE_FILE" "$INTERFACE_CONTENT"

# 2. Create Manager Model
MODEL_FILE="$MODEL_DIR/manager.ts"
MODEL_CONTENT=$(cat <<'EOL'
import mongoose from "mongoose";
import { IManager } from "../../interfaces/manager";

const ManagerSchema = new mongoose.Schema<IManager>(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },  // Linking to Admin
    fileId: { type: String, required: true }, // Identifier for the uploaded file
    fileURL: { type: String },                 // URL to access the uploaded file (optional)
    role: { type: String, required: true },    // Role of the manager
  },
  { timestamps: true }
);

// Optionally, add pre-save hook for hashing passwords
// Uncomment the following lines if you wish to hash passwords before saving
/*
import bcrypt from "bcrypt";

ManagerSchema.pre<IManager>("save", async function (next) {
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

export const ManagerModel = mongoose.model<IManager>("Manager", ManagerSchema);
EOL
)

create_or_overwrite_file "$MODEL_FILE" "$MODEL_CONTENT"

# 3. Create Manager Repository
REPO_FILE="$REPO_DIR/manager.ts"
REPO_CONTENT=$(cat <<'EOL'
import { Request } from "express";
import { ManagerModel, IManager } from "../models/manager";
import { ICreateManager, IUpdateManager } from "../../interfaces/manager";
import { logError } from "../../utils/errorLogger";

class ManagerRepository {
  public async getManagers(req: Request, pagination: { page: number; limit: number }, search: string): Promise<{ data: IManager[]; totalCount: number; currentPage: number; totalPages: number }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await ManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const managers = await ManagerModel.find(query)
        .populate("admin", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: managers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagers");
      throw error;
    }
  }

  public async getManagerById(req: Request, id: string): Promise<IManager> {
    try {
      const managerDoc = await ManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin", "name");

      if (!managerDoc) {
        throw new Error("Manager not found");
      }

      return managerDoc;
    } catch (error) {
      await logError(error, req, "ManagerRepository-getManagerById");
      throw error;
    }
  }

  public async createManager(req: Request, managerData: ICreateManager): Promise<IManager> {
    try {
      const newManager = await ManagerModel.create(managerData);
      return newManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-createManager");
      throw error;
    }
  }

  public async updateManager(req: Request, id: string, managerData: Partial<IUpdateManager>): Promise<IManager> {
    try {
      const updatedManager = await ManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        managerData,
        { new: true }
      ).populate("admin", "name");
      if (!updatedManager) {
        throw new Error("Failed to update manager");
      }
      return updatedManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-updateManager");
      throw error;
    }
  }

  public async deleteManager(req: Request, id: string): Promise<IManager> {
    try {
      const deletedManager = await ManagerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      ).populate("admin", "name");
      if (!deletedManager) {
        throw new Error("Failed to delete manager");
      }
      return deletedManager;
    } catch (error) {
      await logError(error, req, "ManagerRepository-deleteManager");
      throw error;
    }
  }
}

export default ManagerRepository;
EOL
)

create_or_overwrite_file "$REPO_FILE" "$REPO_CONTENT"

# 4. Create Manager Service
SERVICE_FILE="$SERVICE_DIR/manager.ts"
SERVICE_CONTENT=$(cat <<'EOL'
import { Request, Response } from "express";
import ManagerRepository from "../database/repositories/manager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ManagerService {
  private managerRepository: ManagerRepository;

  constructor() {
    this.managerRepository = new ManagerRepository();
  }

  public async getManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const managers = await this.managerRepository.getManagers(req, pagination, search);
      res.sendArrayFormatted(
        managers.data,
        "Managers retrieved successfully",
        200,
        managers.totalCount,
        managers.currentPage,
        managers.totalPages
      );
    } catch (error) {
      await logError(error, req, "ManagerService-getManagers");
      res.sendError("Managers retrieval failed", 500);
    }
  }

  public async getManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const manager = await this.managerRepository.getManagerById(req, id);
      res.sendFormatted(manager, "Manager retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-getManager");
      res.sendError("Manager retrieval failed", 500);
    }
  }

  public async createManager(req: Request, res: Response) {
    try {
      const managerData = req.body;
      console.log(req.body);

      // Integrate fileId and fileURL received from another API
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        managerData.fileId = fileId;
        managerData.fileURL = fileURL;
      } else {
        res.sendError("fileId and fileURL must be provided", 400);
        return;
      }

      const newManager = await this.managerRepository.createManager(req, managerData);
      res.sendFormatted(newManager, "Manager created successfully", 201);
    } catch (error) {
      await logError(error, req, "ManagerService-createManager");
      res.sendError("Manager creation failed", 500);
    }
  }

  public async updateManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const managerData = req.body;

      // Integrate fileId and fileURL received from another API, if provided
      const { fileId, fileURL } = req.body;
      if (fileId && fileURL) {
        managerData.fileId = fileId;
        managerData.fileURL = fileURL;
      }

      const updatedManager = await this.managerRepository.updateManager(req, id, managerData);
      res.sendFormatted(updatedManager, "Manager updated successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-updateManager");
      res.sendError("Manager update failed", 500);
    }
  }

  public async deleteManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedManager = await this.managerRepository.deleteManager(req, id);
      res.sendFormatted(deletedManager, "Manager deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "ManagerService-deleteManager");
      res.sendError("Manager deletion failed", 500);
    }
  }
}

export default ManagerService;
EOL
)

create_or_overwrite_file "$SERVICE_FILE" "$SERVICE_CONTENT"

# 5. Create Manager Middleware
MIDDLEWARE_FILE="$MIDDLEWARE_DIR/manager.ts"
MIDDLEWARE_CONTENT=$(cat <<'EOL'
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ManagerMiddleware {
  public async createManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin, role, fileId, fileURL } = req.body;
      if (!email || !name || !password || !admin || !role || !fileId || !fileURL) {
        res.sendError(
          "Email, Name, Password, Admin, Role, fileId, and fileURL must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerCreate");
      res.sendError("An unexpected error occurred", 500);
    }
  }

  public async updateManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, admin, role, fileId, fileURL } = req.body;
      if (!email && !name && !password && !admin && !role && !fileId && !fileURL) {
        res.sendError(
          "At least one field (Email, Name, Password, Admin, Role, fileId, or fileURL) must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerUpdate");
      res.sendError("An unexpected error occurred", 500);
    }
  }

  public async deleteManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerDelete");
      res.sendError("An unexpected error occurred", 500);
    }
  }

  public async getManager(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-ManagerGet");
      res.sendError("An unexpected error occurred", 500);
    }
  }
}

export default ManagerMiddleware;
EOL
)

create_or_overwrite_file "$MIDDLEWARE_FILE" "$MIDDLEWARE_CONTENT"

# 6. Create Manager Route
ROUTE_FILE="$ROUTES_DIR/manager.ts"
ROUTE_CONTENT=$(cat <<'EOL'
import { Router } from "express";
import ManagerService from "../services/manager";
import ManagerMiddleware from "../middlewares/manager";

const managerRoute = Router();
const managerService = new ManagerService();
const managerMiddleware = new ManagerMiddleware();

// GET /api/managers - Retrieve all managers
managerRoute.get("/", managerService.getManagers.bind(managerService));

// GET /api/managers/:id - Retrieve a specific manager
managerRoute.get(
  "/:id",
  managerMiddleware.getManager.bind(managerMiddleware),
  managerService.getManager.bind(managerService)
);

// POST /api/managers - Create a new manager
managerRoute.post(
  "/",
  managerMiddleware.uploadFile, // Assuming uploadFile is defined if needed
  managerMiddleware.createManager.bind(managerMiddleware),
  managerService.createManager.bind(managerService)
);

// PATCH /api/managers/:id - Update an existing manager
managerRoute.patch(
  "/:id",
  managerMiddleware.uploadFile, // Assuming uploadFile is defined if needed
  managerMiddleware.updateManager.bind(managerMiddleware),
  managerService.updateManager.bind(managerService)
);

// DELETE /api/managers/:id - Delete a manager
managerRoute.delete(
  "/:id",
  managerMiddleware.deleteManager.bind(managerMiddleware),
  managerService.deleteManager.bind(managerService)
);

export default managerRoute;
EOL
)

create_or_overwrite_file "$ROUTE_FILE" "$ROUTE_CONTENT"

# 7. Create Main Routes Integration
MAIN_ROUTE_FILE="$ROUTES_DIR/index.ts"

if [ ! -f "$MAIN_ROUTE_FILE" ]; then
  echo "📝 Creating main route file at $MAIN_ROUTE_FILE."
  MAIN_ROUTE_CONTENT=$(cat <<'EOL'
import { Router } from "express";

// Import Manager routes
import managerRoute from "./manager";

// Initialize the main router
const router = Router();

// Use Manager routes
router.use("/managers", managerRoute);

// Export the main router
export default router;
EOL
  )
  create_or_overwrite_file "$MAIN_ROUTE_FILE" "$MAIN_ROUTE_CONTENT"
else
  # Check if managerRoute is already included
  if grep -q "import managerRoute from \"./manager\";" "$MAIN_ROUTE_FILE"; then
    echo "📝 Manager routes already integrated in $MAIN_ROUTE_FILE."
  else
    echo "📝 Adding Manager routes integration to $MAIN_ROUTE_FILE."
    # Append the import and use statements before the export
    sed -i.bak '/^import.*Router from "express";$/a import managerRoute from "./manager";\n\nrouter.use("/managers", managerRoute);' "$MAIN_ROUTE_FILE"
    echo "✅ Manager routes have been integrated into $MAIN_ROUTE_FILE."
  fi
fi

# 8. Ensure Utility Files Exist (errorLogger.ts and responseFormatter.ts)

# 8.1 Create Error Logger
ERROR_LOGGER_FILE="$UTILS_DIR/errorLogger.ts"
ERROR_LOGGER_CONTENT=$(cat <<'EOL'
import { Request } from "express";

export const logError = async (error: any, req: Request, context: string) => {
  console.error(`[${new Date().toISOString()}] [${context}]`, {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });
  // Optionally, integrate with a logging service like Winston or Loggly
};
EOL
)

create_or_overwrite_file "$ERROR_LOGGER_FILE" "$ERROR_LOGGER_CONTENT"

# 8.2 Create Response Formatter Middleware (if not already present)
RESPONSE_FORMATTER_FILE="$UTILS_DIR/responseFormatter.ts"
if [ ! -f "$RESPONSE_FORMATTER_FILE" ]; then
  RESPONSE_FORMATTER_CONTENT=$(cat <<'EOL'
import { Request, Response, NextFunction } from "express";

const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  res.sendFormatted = (data: any, message: string, statusCode: number = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };

  res.sendArrayFormatted = (
    data: any[],
    message: string,
    statusCode: number = 200,
    totalCount?: number,
    currentPage?: number,
    totalPages?: number
  ) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      totalCount,
      currentPage,
      totalPages,
    });
  };

  res.sendError = (errorMessage: string, statusCode: number = 500) => {
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  };

  next();
};

export default responseFormatter;
EOL
  )
  create_or_overwrite_file "$RESPONSE_FORMATTER_FILE" "$RESPONSE_FORMATTER_CONTENT"
else
  echo "📝 responseFormatter.ts already exists at $RESPONSE_FORMATTER_FILE."
fi

# 9. Create Type Declaration for Custom Response Methods
TYPE_DECLARATION_FILE="$TYPES_DIR/express.d.ts"
if [ ! -f "$TYPE_DECLARATION_FILE" ]; then
  TYPE_DECLARATION_CONTENT=$(cat <<'EOL'
import { IManager, ICreateManager, IUpdateManager } from '../interfaces/manager';

declare namespace Express {
  export interface Response {
    sendFormatted: (data: any, message: string, statusCode?: number) => void;
    sendArrayFormatted: (
      data: any[],
      message: string,
      statusCode?: number,
      totalCount?: number,
      currentPage?: number,
      totalPages?: number
    ) => void;
    sendError: (errorMessage: string, statusCode?: number) => void;
  }
}
EOL
  )
  create_or_overwrite_file "$TYPE_DECLARATION_FILE" "$TYPE_DECLARATION_CONTENT"
else
  echo "📝 Type declaration for Express.Response already exists at $TYPE_DECLARATION_FILE."
fi

# 10. Final Notifications
echo "🎉 Manager module setup completed successfully."
echo "⚠️ All specified files have been created or overwritten."
echo "🔄 Please ensure that your main application integrates the new routes and utilities correctly."
echo "📌 Remember to restart your development server and TypeScript server if running."

# End of script
