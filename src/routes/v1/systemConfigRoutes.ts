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

export default router;

