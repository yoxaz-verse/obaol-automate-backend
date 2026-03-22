import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { orderSubflowConfigController } from "../../controllers/orderSubflowConfigController";

const router = Router();

router.get("/", authenticateToken, (req, res, next) => orderSubflowConfigController.list(req, res, next));
router.post("/", authenticateToken, (req, res, next) => orderSubflowConfigController.create(req, res, next));
router.patch("/:id", authenticateToken, (req, res, next) => orderSubflowConfigController.update(req, res, next));
router.delete("/:id", authenticateToken, (req, res, next) => orderSubflowConfigController.remove(req, res, next));

export default router;
