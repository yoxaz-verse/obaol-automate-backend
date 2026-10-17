import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { LabWorkItemController } from "../../controllers/labWorkItemController";

const router = Router();
const controller = new LabWorkItemController();
router.use(authenticateToken);
router.get("/", (req, res, next) => controller.list(req, res).catch(next));
router.get("/:id", (req, res, next) => controller.detail(req, res).catch(next));
router.patch("/:id/status", (req, res, next) => controller.transition(req, res).catch(next));
export default router;
