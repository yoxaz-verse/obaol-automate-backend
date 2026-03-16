import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { CommissionController } from "../../controllers/commissionController";

const router = Router();

router.get("/operator/:operatorId", authenticateToken, CommissionController.getOperatorHistory);

export default router;
