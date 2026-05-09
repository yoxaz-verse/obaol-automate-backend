import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { systemConfigController } from "../../controllers/systemConfigController";

const router = Router();

router.get("/obaol-company", authenticateToken, (req, res, next) =>
  systemConfigController.getObaolCompany(req, res, next)
);
router.post("/obaol-company", authenticateToken, (req, res, next) =>
  systemConfigController.setObaolCompany(req, res, next)
);
router.get("/calculations", authenticateToken, (req, res, next) =>
  systemConfigController.getCalculations(req, res, next)
);
router.post("/calculations", authenticateToken, (req, res, next) =>
  systemConfigController.setCalculations(req, res, next)
);
router.get("/email-templates", authenticateToken, (req, res, next) =>
  systemConfigController.listEmailTemplates(req, res, next)
);
router.post("/email-templates/draft", authenticateToken, (req, res, next) =>
  systemConfigController.saveEmailTemplateDraft(req, res, next)
);
router.post("/email-templates/publish", authenticateToken, (req, res, next) =>
  systemConfigController.publishEmailTemplate(req, res, next)
);
router.post("/email-templates/test", authenticateToken, (req, res, next) =>
  systemConfigController.testEmailTemplate(req, res, next)
);

export default router;
