import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { CommissionController } from "../../controllers/commissionController";

const router = Router();

router.get("/employee/:employeeId", authenticateToken, CommissionController.getEmployeeHistory);

export default router;
