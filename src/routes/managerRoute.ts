import { Router } from "express";
import ManagerService from "../services/manager";
import ManagerMiddleware from "../middlewares/manager";

const managerRoute = Router();
const managerService = new ManagerService();
const managerMiddleware = new ManagerMiddleware();

managerRoute.get("/", managerService.getManagers.bind(managerService));
managerRoute.get(
  "/:id",
  managerMiddleware.getManager.bind(managerMiddleware),
  managerService.getManager.bind(managerService)
);
managerRoute.post(
  "/",
  managerMiddleware.createManager.bind(managerMiddleware),
  managerService.createManager.bind(managerService)
);
managerRoute.patch(
  "/:id",
  managerMiddleware.updateManager.bind(managerMiddleware),
  managerService.updateManager.bind(managerService)
);
managerRoute.delete(
  "/:id",
  managerMiddleware.deleteManager.bind(managerMiddleware),
  managerService.deleteManager.bind(managerService)
);

export default managerRoute;
