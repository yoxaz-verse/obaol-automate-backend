import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import CategoryService from "../services/category";
import CategoryMiddleware from "../middlewares/category";

const router = Router();
const categoryService = new CategoryService();
const categoryMiddleware = new CategoryMiddleware();

router.get(
  "/",
  authenticateToken,
  categoryService.getCategories.bind(categoryService)
);
router.get(
  "/:id",
  authenticateToken,
  categoryService.getCategory.bind(categoryService)
);
router.post(
  "/",
  authenticateToken,
  categoryMiddleware.createCategory.bind(categoryMiddleware),
  categoryService.createCategory.bind(categoryService)
);
router.patch(
  "/:id",
  authenticateToken,
  categoryMiddleware.updateCategory.bind(categoryMiddleware),
  categoryService.updateCategory.bind(categoryService)
);
router.delete(
  "/:id",
  authenticateToken,
  categoryMiddleware.deleteCategory.bind(categoryMiddleware),
  categoryService.deleteCategory.bind(categoryService)
);

export default router;
