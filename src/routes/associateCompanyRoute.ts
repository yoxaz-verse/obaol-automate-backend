import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import AssociateCompanyService from "../services/associatesCompany";
import AssociateCompanyMiddleware from "../middlewares/associateCompany";

const router = Router();
const associateCompanyService = new AssociateCompanyService();
const associateCompanyMiddleware = new AssociateCompanyMiddleware();

router.get(
  "/",
  authenticateToken,
  associateCompanyService.getAssociateCompanies.bind(associateCompanyService)
);
router.get(
  "/:id",
  authenticateToken,
  associateCompanyMiddleware.validateAssociateCompanyId,
  associateCompanyService.getAssociateCompany.bind(associateCompanyService)
);
router.post(
  "/",
  authenticateToken,
  associateCompanyMiddleware.createAssociateCompany,
  associateCompanyService.createAssociateCompany.bind(associateCompanyService)
);
router.patch(
  "/:id",
  authenticateToken,
  associateCompanyMiddleware.validateAssociateCompanyId,
  associateCompanyMiddleware.updateAssociateCompany,
  associateCompanyService.updateAssociateCompany.bind(associateCompanyService)
);
router.delete(
  "/:id",
  authenticateToken,
  associateCompanyMiddleware.validateAssociateCompanyId,
  associateCompanyService.deleteAssociateCompany.bind(associateCompanyService)
);

export default router;
