import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { dataIntegrityController } from "../../controllers/dataIntegrityController";

const router = Router();
router.use(authenticateToken, authorizeRoles("Admin"));
router.get("/data-integrity/orphans", dataIntegrityController.orphans);
router.post("/data-integrity/orphans/cleanup", dataIntegrityController.cleanup);
router.get("/associates/:id/permanent-delete-preview", dataIntegrityController.previewAssociate);
router.delete("/associates/:id/permanent", dataIntegrityController.deleteAssociate);
router.get("/associate-companies/:id/permanent-delete-preview", dataIntegrityController.previewCompany);
router.delete("/associate-companies/:id/permanent", dataIntegrityController.deleteCompany);
export default router;
