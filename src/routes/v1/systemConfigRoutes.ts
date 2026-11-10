import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { systemConfigController } from "../../controllers/systemConfigController";
import { CompanySignatureController } from "../../controllers/companySignatureController";
import { upload as signatureUpload } from "./companySignatureRoutes";

const router = Router();
const obaolSignature = new CompanySignatureController(true);

router.get("/obaol-company", authenticateToken, (req, res, next) =>
  systemConfigController.getObaolCompany(req, res, next)
);
router.post("/obaol-company", authenticateToken, (req, res, next) =>
  systemConfigController.setObaolCompany(req, res, next)
);
router.get("/obaol-company/signature", authenticateToken, obaolSignature.get.bind(obaolSignature));
router.post("/obaol-company/signature", authenticateToken, signatureUpload.single("signature"), obaolSignature.save.bind(obaolSignature));
router.delete("/obaol-company/signature", authenticateToken, obaolSignature.remove.bind(obaolSignature));
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
