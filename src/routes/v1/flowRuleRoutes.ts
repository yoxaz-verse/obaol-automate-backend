import { Router } from "express";
import { flowRuleController } from "../../controllers/flowRuleController";
import authenticateToken from "../../middlewares/auth";

const router = Router();

router.get("/", authenticateToken, (req, res, next) => flowRuleController.list(req, res, next));
router.post("/", authenticateToken, (req, res, next) => flowRuleController.create(req, res, next));
router.patch("/seed", authenticateToken, (req, res, next) => flowRuleController.seed(req, res, next));
router.post("/seed", authenticateToken, (req, res, next) => flowRuleController.seed(req, res, next));
router.patch("/:id", authenticateToken, (req, res, next) => flowRuleController.update(req, res, next));
router.delete("/:id", authenticateToken, (req, res, next) => flowRuleController.remove(req, res, next));

export default router;
