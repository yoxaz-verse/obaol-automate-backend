import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { organizationReportController } from "../../controllers/organizationReportController";

const router = Router();

router.use(authenticateToken);

router.patch(
  "/:id/action",
  authorizeRoles("Admin"),
  organizationReportController.applyAdminAction.bind(organizationReportController)
);

export default router;
