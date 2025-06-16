import fs from "fs";
import path from "path";
import readline from "readline";

// Prompt utility using readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question: string): Promise<string> => {
  return new Promise((resolve) => rl.question(question, resolve));
};

// Prompt for model and fields
async function promptForModel() {
  const modelName = await ask("Enter model name (e.g., Product): ");
  const fields: { name: string; type: string; ref?: string }[] = [];

  while (true) {
    const input = await ask(
      "Enter field (name:type or name:ref:RefModel), or leave empty to finish: "
    );
    if (!input.trim()) break;

    const [name, type, ref] = input.split(":");
    if (!name || !type) {
      console.log(
        "❌ Invalid input. Use format: name:type or name:ref:RefModel"
      );
      continue;
    }

    fields.push({ name, type, ...(type === "ref" && ref ? { ref } : {}) });
  }

  rl.close();
  return { modelName, fields };
}

// Template generator
function generateCRUDTemplates(modelName: string) {
  const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const upper = modelName.charAt(0).toUpperCase() + modelName.slice(1);

  return {
    [`services/${lower}.ts`]: `
import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import ${upper}Repository from "../database/repositories/${lower}";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class ${upper}Service {
  private ${lower}Repository: ${upper}Repository;

  constructor() {
    this.${lower}Repository = new ${upper}Repository();
  }

  public async get${upper}s(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters);
      const result = await this.${lower}Repository.get${upper}s(req, pagination, dynamicQuery);
      res.json({
        message: "${upper}s retrieved successfully",
        data: result
      });
    } catch (error) {
      logError(error, req, "${upper}Service-get${upper}s");
      res.status(500).send("${upper}s retrieval failed");
    }
  }

  public async get${upper}(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await this.${lower}Repository.get${upper}ById(req, id);
      if (item) res.json(item);
      else res.status(404).send("${upper} not found");
    } catch (error) {
      logError(error, req, "${upper}Service-get${upper}");
      res.status(500).send("Error retrieving ${lower}");
    }
  }

  public async create${upper}(req: Request, res: Response) {
    try {
      const data = req.body;
      const created = await this.${lower}Repository.create${upper}(req, data);
      res.status(201).json({ data: created, message: "${upper} created successfully" });
    } catch (error) {
      logError(error, req, "${upper}Service-create${upper}");
      res.status(500).send("${upper} creation failed");
    }
  }

  public async update${upper}(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await this.${lower}Repository.update${upper}(req, id, data);
      if (updated) res.json({ data: updated, message: "${upper} updated successfully" });
      else res.status(404).send("${upper} not found");
    } catch (error) {
      logError(error, req, "${upper}Service-update${upper}");
      res.status(500).send("${upper} update failed");
    }
  }

  public async delete${upper}(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.${lower}Repository.delete${upper}(req, id);
      if (deleted) res.json({ data: deleted, message: "${upper} deleted successfully" });
      else res.status(404).send("${upper} not found");
    } catch (error) {
      logError(error, req, "${upper}Service-delete${upper}");
      res.status(500).send("${upper} deletion failed");
    }
  }
}

export default ${upper}Service;
`,

    [`database/repositories/${lower}.ts`]: `
import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { ${upper}Model } from "../../database/models/${lower}";

class ${upper}Repository {
  public async get${upper}s(req: Request, pagination: IPagination, query: any) {
    try {
      const docs = await ${upper}Model.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await ${upper}Model.countDocuments(query);
      return {
        data: docs.map(d => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(error, req, "${upper}Repository-get${upper}s");
      throw error;
    }
  }

  public async get${upper}ById(req: Request, id: string) {
    try {
      const doc = await ${upper}Model.findById(id);
      if (!doc) throw new Error("${upper} not found");
      return doc.toObject();
    } catch (error) {
      logError(error, req, "${upper}Repository-get${upper}ById");
      throw error;
    }
  }

  public async create${upper}(req: Request, data: any) {
    try {
      const created = await ${upper}Model.create(data);
      return created.toObject();
    } catch (error) {
      logError(error, req, "${upper}Repository-create${upper}");
      throw error;
    }
  }

  public async update${upper}(req: Request, id: string, data: any) {
    try {
      const updated = await ${upper}Model.findByIdAndUpdate(id, data, { new: true });
      if (!updated) throw new Error("Failed to update ${lower}");
      return updated.toObject();
    } catch (error) {
      logError(error, req, "${upper}Repository-update${upper}");
      throw error;
    }
  }

  public async delete${upper}(req: Request, id: string) {
    try {
      const deleted = await ${upper}Model.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete ${lower}");
      return deleted.toObject();
    } catch (error) {
      logError(error, req, "${upper}Repository-delete${upper}");
      throw error;
    }
  }
}

export default ${upper}Repository;
`,

    [`middlewares/${lower}.ts`]: `
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ${upper}Middleware {
  public async create${upper}(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Missing required fields: name is required." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-${upper}Create");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async update${upper}(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "At least one field (name) must be provided for update." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-${upper}Update");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  public async delete${upper}(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID must be provided for deletion." });
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-${upper}Delete");
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}

export default ${upper}Middleware;
`,

    [`routes/${lower}Route.ts`]: `
import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import ${upper}Service from "../services/${lower}";
import ${upper}Middleware from "../middlewares/${lower}";

const router = Router();
const service = new ${upper}Service();
const middleware = new ${upper}Middleware();

router.get("/", authenticateToken, service.get${upper}s.bind(service));
router.get("/:id", authenticateToken, service.get${upper}.bind(service));
router.post("/", authenticateToken, middleware.create${upper}.bind(middleware), service.create${upper}.bind(service));
router.patch("/:id", authenticateToken, middleware.update${upper}.bind(middleware), service.update${upper}.bind(service));
router.delete("/:id", authenticateToken, middleware.delete${upper}.bind(middleware), service.delete${upper}.bind(service));

export default router;
`,
  };
}

// Write files to disk
function writeFiles(files: Record<string, string>) {
  Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(__dirname, "..", filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content.trimStart());
    console.log(`✅ Created: ${filePath}`);
  });
}

// Main runner
(async () => {
  const { modelName } = await promptForModel();
  const files = generateCRUDTemplates(modelName);
  writeFiles(files);
})();
