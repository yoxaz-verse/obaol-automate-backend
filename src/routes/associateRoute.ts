import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";
import AssociateService from "../services/associates";
import AssociateMiddleware from "../middlewares/associate";

const router = Router();
const associateService = new AssociateService();
const associateMiddleware = new AssociateMiddleware();

router.get(
  "/",
  authenticateToken,
  associateService.getAssociates.bind(associateService)
);
router.get(
  "/:id",
  authenticateToken,
  // associateMiddleware.getAssociate.bind(associateMiddleware),
  associateService.getAssociate.bind(associateService)
);
router.post(
  "/",
  authenticateToken,
  validateUniqueEmail,
  associateMiddleware.createAssociate.bind(associateMiddleware),
  associateService.createAssociate.bind(associateService)
);
router.patch(
  "/:id",
  authenticateToken,
  associateMiddleware.updateAssociate.bind(associateMiddleware),
  associateService.updateAssociate.bind(associateService)
);
router.delete(
  "/:id",
  authenticateToken,
  associateMiddleware.deleteAssociate.bind(associateMiddleware),
  associateService.deleteAssociate.bind(associateService)
);

export default router;
