import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import DisplayedRateMiddleware from "../middlewares/displayedRate";
import DisplayedRateService from "../services/displayedRate";
import authenticateChecking from "../middlewares/authChecking";

const router = Router();
const displayedRateService = new DisplayedRateService();
const displayedRateMiddleware = new DisplayedRateMiddleware();

router.get(
  "/",
  authenticateChecking,
  displayedRateService.getDisplayedRates.bind(displayedRateService)
);
router.get(
  "/:id",
  authenticateToken,
  displayedRateMiddleware.validateDisplayedRateId,
  displayedRateService.getDisplayedRate.bind(displayedRateService)
);
router.post(
  "/",
  authenticateToken,
  displayedRateMiddleware.createDisplayedRate,
  displayedRateService.createDisplayedRate.bind(displayedRateService)
);
router.patch(
  "/:id",
  authenticateToken,
  displayedRateMiddleware.validateDisplayedRateId,
  displayedRateMiddleware.updateDisplayedRate,
  displayedRateService.updateDisplayedRate.bind(displayedRateService)
);
router.delete(
  "/:id",
  authenticateToken,
  displayedRateMiddleware.validateDisplayedRateId,
  displayedRateService.deleteDisplayedRate.bind(displayedRateService)
);

export default router;
