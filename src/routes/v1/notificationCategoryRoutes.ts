import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { notificationCategoryController } from "../../controllers/notificationCategoryController";

const router = Router();
router.use(authenticateToken);
router.get("/", authorizeRoles("Admin", "CustomerSupport"), notificationCategoryController.list.bind(notificationCategoryController));
router.post("/", authorizeRoles("Admin", "CustomerSupport"), notificationCategoryController.create.bind(notificationCategoryController));
router.patch("/:id", authorizeRoles("Admin"), notificationCategoryController.update.bind(notificationCategoryController));
router.delete("/:id", authorizeRoles("Admin"), notificationCategoryController.archive.bind(notificationCategoryController));

export default router;
