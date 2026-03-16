import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { orderRuleController } from "../../controllers/orderRuleController";

const router = Router();

router.get("/", authenticateToken, orderRuleController.list);
router.post("/", authenticateToken, orderRuleController.create);
router.post("/seed", authenticateToken, orderRuleController.seed);
router.patch("/:id", authenticateToken, orderRuleController.update);
router.delete("/:id", authenticateToken, orderRuleController.remove);

export default router;
