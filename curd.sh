#!/bin/bash

# create-module.sh - A script to generate a new module with boilerplate code

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display messages
function echo_info {
  echo -e "\e[34m[CREATE]\e[0m $1"
}

function echo_error {
  echo -e "\e[31m[ERROR]\e[0m $1"
}

# Check if module name is provided
if [ -z "$1" ]; then
  echo_error "No module name provided. Usage: ./create-module.sh <ModuleName>"
  exit 1
fi

MODULE_NAME=$(echo "$1" | awk '{print tolower($0)}')
MODULE_NAME_CAPITALIZED=$(echo "$1" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')

# Define paths
MODELS_DIR="src/models"
REPOSITORIES_DIR="src/repositories"
SERVICES_DIR="src/services"
CONTROLLERS_DIR="src/controllers"
MIDDLEWARES_DIR="src/middlewares"
INTERFACES_DIR="src/interfaces"
ROUTES_DIR="src/routes"

# 1. Create Model
echo_info "Creating Model for $MODULE_NAME_CAPITALIZED..."

cat <<EOT > "$MODELS_DIR/$MODULE_NAME.ts"
import mongoose from "mongoose";

interface I${MODULE_NAME_CAPITALIZED} extends mongoose.Document {
  // Define your schema fields here
  name: string;
  isActive: boolean;
  isDeleted: boolean;
}

const ${MODULE_NAME_CAPITALIZED}Schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    // Add more fields as needed
  },
  { timestamps: true }
);

export const ${MODULE_NAME_CAPITALIZED}Model = mongoose.model<I${MODULE_NAME_CAPITALIZED}>("${MODULE_NAME_CAPITALIZED}", ${MODULE_NAME_CAPITALIZED}Schema);
EOT

# 2. Create Interface
echo_info "Creating Interface for $MODULE_NAME_CAPITALIZED..."

cat <<EOT > "$INTERFACES_DIR/${MODULE_NAME}.ts"
export interface I${MODULE_NAME_CAPITALIZED} {
  _id: string;
  name: string;
  isActive: boolean;
  isDeleted: boolean;
  // Add more fields as needed
}

export interface ICreate${MODULE_NAME_CAPITALIZED} {
  name: string;
  // Add more fields as needed
}

export interface IUpdate${MODULE_NAME_CAPITALIZED} {
  name?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  // Add more fields as needed
}
EOT

# 3. Create Repository
echo_info "Creating Repository for $MODULE_NAME_CAPITALIZED..."

cat <<EOT > "$REPOSITORIES_DIR/${MODULE_NAME}.ts"
import { Request } from "express";
import { ${MODULE_NAME_CAPITALIZED}Model } from "../models/${MODULE_NAME}";
import {
  I${MODULE_NAME_CAPITALIZED},
  ICreate${MODULE_NAME_CAPITALIZED},
  IUpdate${MODULE_NAME_CAPITALIZED},
} from "../../interfaces/${MODULE_NAME}";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ${MODULE_NAME_CAPITALIZED}Repository {
  public async get${MODULE_NAME_CAPITALIZED}s(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: I${MODULE_NAME_CAPITALIZED}[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { \$regex: search, \$options: "i" };
      }
      const ${MODULE_NAME}s = await ${MODULE_NAME_CAPITALIZED}Model.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await ${MODULE_NAME_CAPITALIZED}Model.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: ${MODULE_NAME}s,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Repository-get${MODULE_NAME_CAPITALIZED}s");
      throw error;
    }
  }

  public async get${MODULE_NAME_CAPITALIZED}ById(req: Request, id: string): Promise<I${MODULE_NAME_CAPITALIZED}> {
    try {
      const ${MODULE_NAME} = await ${MODULE_NAME_CAPITALIZED}Model.findById(id).lean();
      if (!${MODULE_NAME} || ${MODULE_NAME}.isDeleted) {
        throw new Error("${MODULE_NAME_CAPITALIZED} not found");
      }
      return ${MODULE_NAME};
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Repository-get${MODULE_NAME_CAPITALIZED}ById");
      throw error;
    }
  }

  public async create${MODULE_NAME_CAPITALIZED}(req: Request, ${MODULE_NAME}Data: ICreate${MODULE_NAME_CAPITALIZED}): Promise<I${MODULE_NAME_CAPITALIZED}> {
    try {
      const new${MODULE_NAME_CAPITALIZED} = await ${MODULE_NAME_CAPITALIZED}Model.create(${MODULE_NAME}Data);
      return new${MODULE_NAME_CAPITALIZED}.toObject();
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Repository-create${MODULE_NAME_CAPITALIZED}");
      throw error;
    }
  }

  public async update${MODULE_NAME_CAPITALIZED}(req: Request, id: string, ${MODULE_NAME}Data: IUpdate${MODULE_NAME_CAPITALIZED}): Promise<I${MODULE_NAME_CAPITALIZED}> {
    try {
      const updated${MODULE_NAME_CAPITALIZED} = await ${MODULE_NAME_CAPITALIZED}Model.findByIdAndUpdate(id, ${MODULE_NAME}Data, { new: true }).lean();
      if (!updated${MODULE_NAME_CAPITALIZED} || updated${MODULE_NAME_CAPITALIZED}.isDeleted) {
        throw new Error("Failed to update ${MODULE_NAME_CAPITALIZED}");
      }
      return updated${MODULE_NAME_CAPITALIZED};
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Repository-update${MODULE_NAME_CAPITALIZED}");
      throw error;
    }
  }

  public async delete${MODULE_NAME_CAPITALIZED}(req: Request, id: string): Promise<I${MODULE_NAME_CAPITALIZED}> {
    try {
      const deleted${MODULE_NAME_CAPITALIZED} = await ${MODULE_NAME_CAPITALIZED}Model.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      ).lean();
      if (!deleted${MODULE_NAME_CAPITALIZED}) {
        throw new Error("Failed to delete ${MODULE_NAME_CAPITALIZED}");
      }
      return deleted${MODULE_NAME_CAPITALIZED};
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Repository-delete${MODULE_NAME_CAPITALIZED}");
      throw error;
    }
  }
}

export default ${MODULE_NAME_CAPITALIZED}Repository;
EOT

# 4. Create Service
echo_info "Creating Service for $MODULE_NAME_CAPITALIZED..."

cat <<EOT > "$SERVICES_DIR/${MODULE_NAME}.ts"
import { Request, Response } from "express";
import ${MODULE_NAME_CAPITALIZED}Repository from "../repositories/${MODULE_NAME}";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class ${MODULE_NAME_CAPITALIZED}Service {
  private ${MODULE_NAME}Repository: ${MODULE_NAME_CAPITALIZED}Repository;

  constructor() {
    this.${MODULE_NAME}Repository = new ${MODULE_NAME_CAPITALIZED}Repository();
  }

  public async get${MODULE_NAME_CAPITALIZED}s(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const ${MODULE_NAME}s = await this.${MODULE_NAME}Repository.get${MODULE_NAME_CAPITALIZED}s(req, pagination, search);
      res.sendArrayFormatted(${MODULE_NAME}s, "${MODULE_NAME_CAPITALIZED}s retrieved successfully");
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Service-get${MODULE_NAME_CAPITALIZED}s");
      res.sendError(error, "${MODULE_NAME_CAPITALIZED}s retrieval failed");
    }
  }

  public async get${MODULE_NAME_CAPITALIZED}(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ${MODULE_NAME} = await this.${MODULE_NAME}Repository.get${MODULE_NAME_CAPITALIZED}ById(req, id);
      res.sendFormatted(${MODULE_NAME}, "${MODULE_NAME_CAPITALIZED} retrieved successfully");
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Service-get${MODULE_NAME_CAPITALIZED}");
      res.sendError(error, "${MODULE_NAME_CAPITALIZED} retrieval failed");
    }
  }

  public async create${MODULE_NAME_CAPITALIZED}(req: Request, res: Response) {
    try {
      const ${MODULE_NAME}Data = req.body;
      const new${MODULE_NAME_CAPITALIZED} = await this.${MODULE_NAME}Repository.create${MODULE_NAME_CAPITALIZED}(req, ${MODULE_NAME}Data);
      res.sendFormatted(new${MODULE_NAME_CAPITALIZED}, "${MODULE_NAME_CAPITALIZED} created successfully", 201);
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Service-create${MODULE_NAME_CAPITALIZED}");
      res.sendError(error, "${MODULE_NAME_CAPITALIZED} creation failed");
    }
  }

  public async update${MODULE_NAME_CAPITALIZED}(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ${MODULE_NAME}Data = req.body;
      const updated${MODULE_NAME_CAPITALIZED} = await this.${MODULE_NAME}Repository.update${MODULE_NAME_CAPITALIZED}(req, id, ${MODULE_NAME}Data);
      res.sendFormatted(updated${MODULE_NAME_CAPITALIZED}, "${MODULE_NAME_CAPITALIZED} updated successfully");
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Service-update${MODULE_NAME_CAPITALIZED}");
      res.sendError(error, "${MODULE_NAME_CAPITALIZED} update failed");
    }
  }

  public async delete${MODULE_NAME_CAPITALIZED}(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted${MODULE_NAME_CAPITALIZED} = await this.${MODULE_NAME}Repository.delete${MODULE_NAME_CAPITALIZED}(req, id);
      res.sendFormatted(deleted${MODULE_NAME_CAPITALIZED}, "${MODULE_NAME_CAPITALIZED} deleted successfully");
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Service-delete${MODULE_NAME_CAPITALIZED}");
      res.sendError(error, "${MODULE_NAME_CAPITALIZED} deletion failed");
    }
  }
}

export default ${MODULE_NAME_CAPITALIZED}Service;
EOT

# 5. Create Controller (Optional)
# Depending on your architecture, you might have controllers separate from services.
# If so, include similar steps here.

# 6. Create Middleware
echo_info "Creating Middleware for $MODULE_NAME_CAPITALIZED..."

cat <<EOT > "$MIDDLEWARES_DIR/${MODULE_NAME}.ts"
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ${MODULE_NAME_CAPITALIZED}Middleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError("ValidationError: Name is required", "Name is required", 400);
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Middleware-validateCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.sendError("ValidationError: Name is required for update", "Name is required for update", 400);
        return;
      }
      // Add more validation as needed
      next();
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Middleware-validateUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError("ValidationError: ID is required", "ID is required", 400);
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Middleware-validateDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async validateGet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError("ValidationError: ID is required", "ID is required", 400);
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "${MODULE_NAME_CAPITALIZED}Middleware-validateGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default ${MODULE_NAME_CAPITALIZED}Middleware;
EOT

# 7. Create Routes
echo_info "Creating Routes for $MODULE_NAME_CAPITALIZED..."

cat <<EOT > "$ROUTES_DIR/${MODULE_NAME}Route.ts"
import { Router } from "express";
import ${MODULE_NAME_CAPITALIZED}Service from "../services/${MODULE_NAME}";
import ${MODULE_NAME_CAPITALIZED}Middleware from "../middlewares/${MODULE_NAME}";

const router = Router();
const ${MODULE_NAME}Service = new ${MODULE_NAME_CAPITALIZED}Service();
const ${MODULE_NAME}Middleware = new ${MODULE_NAME_CAPITALIZED}Middleware();

// GET all
router.get(
  "/",
  ${MODULE_NAME}Service.get${MODULE_NAME_CAPITALIZED}s.bind(${MODULE_NAME}Service)
);

// GET by ID
router.get(
  "/:id",
  ${MODULE_NAME}Middleware.validateGet.bind(${MODULE_NAME}Middleware),
  ${MODULE_NAME}Service.get${MODULE_NAME_CAPITALIZED}.bind(${MODULE_NAME}Service)
);

// CREATE
router.post(
  "/",
  ${MODULE_NAME}Middleware.validateCreate.bind(${MODULE_NAME}Middleware),
  ${MODULE_NAME}Service.create${MODULE_NAME_CAPITALIZED}.bind(${MODULE_NAME}Service)
);

// UPDATE
router.patch(
  "/:id",
  ${MODULE_NAME}Middleware.validateUpdate.bind(${MODULE_NAME}Middleware),
  ${MODULE_NAME}Service.update${MODULE_NAME_CAPITALIZED}.bind(${MODULE_NAME}Service)
);

// DELETE
router.delete(
  "/:id",
  ${MODULE_NAME}Middleware.validateDelete.bind(${MODULE_NAME}Middleware),
  ${MODULE_NAME}Service.delete${MODULE_NAME_CAPITALIZED}.bind(${MODULE_NAME}Service)
);

export default router;
EOT

# 8. Register Routes in Main Application
echo_info "Registering routes in the main application..."

MAIN_ROUTE_FILE="src/routes/index.ts"

if [ ! -f "$MAIN_ROUTE_FILE" ]; then
  echo_info "Creating main routes file..."
  mkdir -p src/routes
  cat <<EOT > "$MAIN_ROUTE_FILE"
import { Router } from "express";
import ${MODULE_NAME_CAPITALIZED}Route from "./${MODULE_NAME}Route";

const router = Router();

// Register module routes
router.use("/${MODULE_NAME}", ${MODULE_NAME_CAPITALIZED}Route);

// Add more module routes here

export default router;
EOT

  # Update src/index.ts to use the main routes
  echo_info "Updating src/index.ts to use the main routes..."

  cat <<EOT >> src/index.ts

// Import routes
import routes from "./routes";

// Use routes
app.use("/api", routes);
EOT

else
  echo_info "Main routes file already exists. Please manually register the new module routes if needed."
fi

# 9. Final Message
echo_info "$MODULE_NAME_CAPITALIZED module generated successfully."
echo_info "Don't forget to import and use the routes in your main server file if not already done."
