import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { companyFunctionController } from "../../controllers/companyFunctionController";
import { sidebarGovernanceController } from "../../controllers/sidebarGovernanceController";

const router = Router();

// Public read APIs
router.get("/company-functions", companyFunctionController.listFunctions.bind(companyFunctionController));
router.get("/company-sub-functions", companyFunctionController.listSubFunctions.bind(companyFunctionController));

// Authenticated company mapping APIs
router.post("/company/functions", authenticateToken, companyFunctionController.upsertCompanyFunctions.bind(companyFunctionController));
router.put("/company/functions", authenticateToken, companyFunctionController.upsertCompanyFunctions.bind(companyFunctionController));
router.delete("/company/functions/:id", authenticateToken, companyFunctionController.deleteCompanyFunctionMapping.bind(companyFunctionController));

// Admin management APIs
router.post("/admin/company-functions", authenticateToken, authorizeRoles("Admin"), companyFunctionController.createFunction.bind(companyFunctionController));
router.put("/admin/company-functions/:id", authenticateToken, authorizeRoles("Admin"), companyFunctionController.updateFunction.bind(companyFunctionController));
router.post("/admin/company-sub-functions", authenticateToken, authorizeRoles("Admin"), companyFunctionController.createSubFunction.bind(companyFunctionController));
router.put("/admin/company-sub-functions/:id", authenticateToken, authorizeRoles("Admin"), companyFunctionController.updateSubFunction.bind(companyFunctionController));

router.get("/sidebar-governance/published", authenticateToken, sidebarGovernanceController.getPublished.bind(sidebarGovernanceController));
router.get("/admin/sidebar-governance", authenticateToken, authorizeRoles("Admin"), sidebarGovernanceController.getAdmin.bind(sidebarGovernanceController));
router.put("/admin/sidebar-governance/draft", authenticateToken, authorizeRoles("Admin"), sidebarGovernanceController.saveDraft.bind(sidebarGovernanceController));
router.post("/admin/sidebar-governance/publish", authenticateToken, authorizeRoles("Admin"), sidebarGovernanceController.publish.bind(sidebarGovernanceController));
router.post("/admin/sidebar-governance/reset-draft", authenticateToken, authorizeRoles("Admin"), sidebarGovernanceController.resetDraft.bind(sidebarGovernanceController));

export default router;
