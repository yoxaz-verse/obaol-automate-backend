import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import ProductVariantService from "../services/productVariant";
import ProductVariantMiddleware from "../middlewares/productVariant";

const router = Router();
const productVariantService = new ProductVariantService();
const productVariantMiddleware = new ProductVariantMiddleware();

router.get(
  "/",
  authenticateToken,
  productVariantService.getProductVariants.bind(productVariantService)
);
router.get(
  "/:id",
  authenticateToken,
  productVariantMiddleware.validateVariantId,
  productVariantService.getProductVariant.bind(productVariantService)
);
router.post(
  "/",
  authenticateToken,
  productVariantMiddleware.createProductVariant,
  productVariantService.createProductVariant.bind(productVariantService)
);
router.patch(
  "/:id",
  authenticateToken,
  productVariantMiddleware.validateVariantId,
  productVariantMiddleware.updateProductVariant,
  productVariantService.updateProductVariant.bind(productVariantService)
);
router.delete(
  "/:id",
  authenticateToken,
  productVariantMiddleware.validateVariantId,
  productVariantService.deleteProductVariant.bind(productVariantService)
);

export default router;
