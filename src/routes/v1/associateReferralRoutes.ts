import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { AssociateReferralController } from "../../controllers/associateReferralController";

const router = Router();
router.get("/me", authenticateToken, AssociateReferralController.getDashboard);
router.get("/company/:companyId", authenticateToken, AssociateReferralController.getDashboard);
router.post("/invitations", authenticateToken, AssociateReferralController.createInvitation);
router.get("/offerings", authenticateToken, AssociateReferralController.listShareableOfferings);
router.post("/shares", authenticateToken, AssociateReferralController.createShare);
router.get("/shares/public/:token", AssociateReferralController.resolveShare);
export default router;
