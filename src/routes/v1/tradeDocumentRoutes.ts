import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { TradeDocumentController } from "../../controllers/tradeDocumentController";

const router = Router();
const controller = new TradeDocumentController();

router.post("/", authenticateToken, controller.create.bind(controller));
router.get("/", authenticateToken, controller.list.bind(controller));
router.get("/:id", authenticateToken, controller.getById.bind(controller));
router.patch("/:id", authenticateToken, controller.update.bind(controller));

export default router;
