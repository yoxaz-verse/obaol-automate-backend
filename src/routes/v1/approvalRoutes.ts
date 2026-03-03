import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { approvalController } from "../../controllers/approvalController";

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles("Admin"));

router.post("/bulk-approve-existing", approvalController.approveExistingPending.bind(approvalController));

router.get("/associates", approvalController.listAssociates.bind(approvalController));
router.patch("/associates/:id", approvalController.actionAssociate.bind(approvalController));

router.get("/companies", approvalController.listCompanies.bind(approvalController));
router.patch("/companies/:id", approvalController.actionCompany.bind(approvalController));

export default router;
