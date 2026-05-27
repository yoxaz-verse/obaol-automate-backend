import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { DirectoryController } from "../../controllers/directoryController";

const router = Router();
const controller = new DirectoryController();

router.get("/warehouses/directory", authenticateToken, (req, res, next) =>
  controller.warehousesDirectory(req, res).catch(next)
);

router.get("/associate-companies/labs-directory", authenticateToken, (req, res, next) =>
  controller.labsDirectory(req, res).catch(next)
);

export default router;
