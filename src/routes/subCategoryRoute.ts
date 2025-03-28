import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import SubCategoryService from "../services/subCategory";
import SubCategoryMiddleware from "../middlewares/subCategory";

const router = Router();
const subCategoryService = new SubCategoryService();
const subCategoryMiddleware = new SubCategoryMiddleware();

router.get(
  "/",
  authenticateToken,
  subCategoryService.getSubCategories.bind(subCategoryService)
);
router.get(
  "/:id",
  authenticateToken,
  subCategoryService.getSubCategory.bind(subCategoryService)
);
router.post(
  "/",
  authenticateToken,
  subCategoryMiddleware.createSubCategory.bind(subCategoryMiddleware),
  subCategoryService.createSubCategory.bind(subCategoryService)
);
router.patch(
  "/:id",
  authenticateToken,
  subCategoryMiddleware.updateSubCategory.bind(subCategoryMiddleware),
  subCategoryService.updateSubCategory.bind(subCategoryService)
);
router.delete(
  "/:id",
  authenticateToken,
  subCategoryMiddleware.deleteSubCategory.bind(subCategoryMiddleware),
  subCategoryService.deleteSubCategory.bind(subCategoryService)
);

export default router;
