import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { serviceDirectoryController as c } from "../../controllers/serviceDirectoryController";
const router = Router();
router.use(authenticateToken);
router.get("/", c.list.bind(c));
router.get("/:companyId/vehicles", c.vehicles.bind(c));
router.get("/:companyId", c.detail.bind(c));
export default router;
