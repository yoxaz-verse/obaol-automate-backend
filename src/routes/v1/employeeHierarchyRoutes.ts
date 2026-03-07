import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { EmployeeHierarchyController } from "../../controllers/employeeHierarchyController";

const router = Router();

router.get("/leadership/:employeeId", authenticateToken, EmployeeHierarchyController.getLeadershipChain);
router.get("/team/:employeeId", authenticateToken, EmployeeHierarchyController.getTeam);

export default router;
