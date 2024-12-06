import { Router } from "express";
import ManagerService from "../services/manager";
import ManagerMiddleware from "../middlewares/manager";
import authenticateToken from "../middlewares/auth";

const managerRoute = Router();
const managerService = new ManagerService();
const managerMiddleware = new ManagerMiddleware();

managerRoute.get(
  "/",
  authenticateToken,
  managerService.getManagers.bind(managerService)
);
managerRoute.get(
  "/:id",
  authenticateToken,
  managerMiddleware.getManager.bind(managerMiddleware),
  managerService.getManager.bind(managerService)
);
managerRoute.post(
  "/",
  authenticateToken,
  // managerMiddleware.uploadProfilePicture, // Handle file upload
  managerMiddleware.createManager.bind(managerMiddleware),
  managerService.createManager.bind(managerService)
);
managerRoute.patch(
  "/:id",
  authenticateToken,
  // managerMiddleware.uploadProfilePicture, // Handle file upload
  managerMiddleware.updateManager.bind(managerMiddleware),
  managerService.updateManager.bind(managerService)
);
managerRoute.delete(
  "/:id",
  authenticateToken,
  managerMiddleware.deleteManager.bind(managerMiddleware),
  managerService.deleteManager.bind(managerService)
);

export default managerRoute;
