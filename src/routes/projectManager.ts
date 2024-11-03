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
  // managerMiddleware.uploadFile, // Assuming uploadFile is defined if needed
  managerMiddleware.createManager.bind(managerMiddleware),
  managerService.createManager.bind(managerService)
);

// PATCH /api/managers/:id - Update an existing manager
managerRoute.patch(
  "/:id",
  // managerMiddleware.uploadFile, // Assuming uploadFile is defined if needed
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
