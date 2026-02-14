import express from "express";
import { OrderController } from "../../controllers/orderController";

const router = express.Router();
const orderController = new OrderController(); // Assuming standard CRUD methods exist

router.post("/", orderController.create);
router.get("/", orderController.getAll);
router.get("/:id", orderController.getById);
router.patch("/:id", orderController.update);
router.delete("/:id", orderController.delete);

export default router;
