import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { realLifeScenarioController as controller } from "../../controllers/realLifeScenarioController";

const router = Router();

router.get("/public", controller.publicList);
router.get("/public/:roleSlug/:slug", controller.publicDetail);
router.get("/preview/:id", controller.preview);
router.get("/admin", authenticateToken, controller.adminList);
router.post("/admin", authenticateToken, controller.create);
router.put("/admin/reorder", authenticateToken, controller.reorder);
router.put("/admin/:id", authenticateToken, controller.update);
router.post("/admin/:id/transition", authenticateToken, controller.transition);
router.post("/admin/:id/preview-token", authenticateToken, controller.previewToken);

export default router;
