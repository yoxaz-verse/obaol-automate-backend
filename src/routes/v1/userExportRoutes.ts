import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { exportUsers } from "../../controllers/userExportController";

const router = Router();

router.get("/", authenticateToken, authorizeRoles("Admin"), exportUsers);

export default router;
