import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { RequirementController } from "../../controllers/requirementController";

const router = Router();
const controller = new RequirementController();
router.use(authenticateToken);
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.get);
router.patch("/:id", controller.update);
router.post("/:id/publish", controller.publish);
router.post("/:id/items/:itemId/bids", controller.bid);
router.post("/:id/items/:itemId/award", controller.award);
router.post("/:id/items/:itemId/status", controller.updateItemStatus);
router.post("/:id/cancel", controller.cancel);
export default router;
