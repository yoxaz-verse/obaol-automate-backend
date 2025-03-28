import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import VariantRateService from "../services/variantRate";
import VariantRateMiddleware from "../middlewares/variantRate";
import authenticateChecking from "../middlewares/authChecking";

const router = Router();
const variantRateService = new VariantRateService();
const variantRateMiddleware = new VariantRateMiddleware();

router.get(
  "/",
  // authenticateToken,
  authenticateChecking,
  variantRateService.getVariantRates.bind(variantRateService)
);

router.get(
  "/associateCompany",
  // authenticateToken,
  variantRateService.getVariantRates.bind(variantRateService)
);
router.get(
  "/:id",
  authenticateToken,
  variantRateMiddleware.validateVariantRateId,
  variantRateService.getVariantRate.bind(variantRateService)
);
router.post(
  "/",
  authenticateToken,
  variantRateMiddleware.createVariantRate,
  variantRateService.createVariantRate.bind(variantRateService)
);
router.patch(
  "/:id",
  authenticateToken,
  variantRateMiddleware.validateVariantRateId,
  variantRateMiddleware.updateVariantRate,
  variantRateService.updateVariantRate.bind(variantRateService)
);
router.delete(
  "/:id",
  authenticateToken,
  variantRateMiddleware.validateVariantRateId,
  variantRateService.deleteVariantRate.bind(variantRateService)
);

export default router;
