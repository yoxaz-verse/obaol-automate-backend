import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { catalogModerationController } from "../../controllers/catalogModerationController";

const router = Router();
router.use(authenticateToken);
router.get("/mine", authorizeRoles("Associate"), catalogModerationController.mine.bind(catalogModerationController));
router.post("/:entityType", authorizeRoles("Associate"), catalogModerationController.createDraft.bind(catalogModerationController));
router.patch("/:entityType/:id", authorizeRoles("Associate"), catalogModerationController.updateDraft.bind(catalogModerationController));
router.post("/:entityType/:id/submit", authorizeRoles("Associate"), catalogModerationController.submit.bind(catalogModerationController));
export default router;
