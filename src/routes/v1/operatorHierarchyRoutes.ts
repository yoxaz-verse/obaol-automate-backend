import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { OperatorHierarchyController } from "../../controllers/operatorHierarchyController";

const router = Router();

router.get("/leadership/:operatorId", authenticateToken, OperatorHierarchyController.getLeadershipChain);
router.get("/team/:operatorId", authenticateToken, OperatorHierarchyController.getTeam);

export default router;
