import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import QuantityUnitService from "../services/quantityUnit";
import QuantityUnitMiddleware from "../middlewares/quantityUnit";

const router = Router();
const quantityUnitService = new QuantityUnitService();
const quantityUnitMiddleware = new QuantityUnitMiddleware();

router.get(
  "/",
  authenticateToken,
  quantityUnitService.getQuantityUnits.bind(quantityUnitService)
);
router.get(
  "/:id",
  authenticateToken,
  quantityUnitMiddleware.validateQuantityUnitId,
  quantityUnitService.getQuantityUnit.bind(quantityUnitService)
);
router.post(
  "/",
  authenticateToken,
  quantityUnitMiddleware.createQuantityUnit,
  quantityUnitService.createQuantityUnit.bind(quantityUnitService)
);
router.patch(
  "/:id",
  authenticateToken,
  quantityUnitMiddleware.validateQuantityUnitId,
  quantityUnitMiddleware.updateQuantityUnit,
  quantityUnitService.updateQuantityUnit.bind(quantityUnitService)
);
router.delete(
  "/:id",
  authenticateToken,
  quantityUnitMiddleware.validateQuantityUnitId,
  quantityUnitService.deleteQuantityUnit.bind(quantityUnitService)
);

export default router;
