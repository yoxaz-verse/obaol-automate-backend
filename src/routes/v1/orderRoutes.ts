import express from "express";
import { OrderController } from "../../controllers/orderController";
import authenticateToken from "../../middlewares/auth";
import { requireActiveSignature } from "../../middlewares/requireActiveSignature";

const router = express.Router();
const orderController = new OrderController(); // Assuming standard CRUD methods exist

router.use(authenticateToken);

router.post("/", requireActiveSignature, orderController.create);
router.post("/external", requireActiveSignature, orderController.createExternal);
router.get("/", orderController.getAll);
router.get("/:id", orderController.getById);
router.patch("/:id/payment-milestones/:index/status", requireActiveSignature, orderController.updatePaymentMilestoneStatus);
router.patch("/:id", requireActiveSignature, orderController.update);
router.delete("/:id", orderController.delete);

export default router;
