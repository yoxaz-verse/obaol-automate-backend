import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { companyFunctionController } from "../../controllers/companyFunctionController";

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

export default router;
