import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { demoController } from "../../controllers/demoController";

const router = Router();

router.post("/orders", authenticateToken, (req, res, next) => demoController.createOrderDemo(req, res, next));
router.delete("/orders", authenticateToken, (req, res, next) => demoController.clearOrderDemo(req, res, next));
router.post("/inventory", authenticateToken, (req, res, next) => demoController.createInventoryDemo(req, res, next));
router.delete("/inventory", authenticateToken, (req, res, next) => demoController.clearInventoryDemo(req, res, next));

export default router;
