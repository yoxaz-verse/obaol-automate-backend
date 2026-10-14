import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { approvalController } from "../../controllers/approvalController";
import { catalogModerationController } from "../../controllers/catalogModerationController";

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles("Admin"));

router.post("/bulk-approve-existing", approvalController.approveExistingPending.bind(approvalController));

router.get("/associates", approvalController.listAssociates.bind(approvalController));
router.patch("/associates/:id", approvalController.actionAssociate.bind(approvalController));

router.get("/companies", approvalController.listCompanies.bind(approvalController));
router.patch("/companies/:id", approvalController.actionCompany.bind(approvalController));

router.get("/operators", approvalController.listOperators.bind(approvalController));
router.patch("/operators/:id", approvalController.actionOperator.bind(approvalController));

router.get("/catalog/:entityType", catalogModerationController.listApprovals.bind(catalogModerationController));
router.patch("/catalog/:entityType/:id", catalogModerationController.review.bind(catalogModerationController));

export default router;
