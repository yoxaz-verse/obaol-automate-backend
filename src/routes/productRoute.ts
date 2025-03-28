import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import ProductService from "../services/product";
import ProductMiddleware from "../middlewares/product";

const router = Router();
const productService = new ProductService();
const productMiddleware = new ProductMiddleware();

router.get(
  "/",
  authenticateToken,
  productService.getProducts.bind(productService)
);
router.get(
  "/:id",
  authenticateToken,
  productMiddleware.validateProductId,
  productService.getProduct.bind(productService)
);
router.post(
  "/",
  authenticateToken,
  productMiddleware.createProduct,
  productService.createProduct.bind(productService)
);
router.patch(
  "/:id",
  authenticateToken,
  productMiddleware.validateProductId,
  productMiddleware.updateProduct,
  productService.updateProduct.bind(productService)
);
router.delete(
  "/:id",
  authenticateToken,
  productMiddleware.validateProductId,
  productService.deleteProduct.bind(productService)
);

export default router;
