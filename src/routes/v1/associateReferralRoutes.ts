import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { AssociateReferralController } from "../../controllers/associateReferralController";

const router = Router();
router.get("/me", authenticateToken, AssociateReferralController.getDashboard);
router.get("/company/:companyId", authenticateToken, AssociateReferralController.getDashboard);
export default router;
