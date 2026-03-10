import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { ServiceRequestController } from "../../controllers/serviceRequestController";

const router = Router();
const controller = new ServiceRequestController();

router.use(authenticateToken);

router.post("/", controller.create.bind(controller));
router.get("/", controller.list.bind(controller));
router.get("/:id", controller.getById.bind(controller));
router.patch("/:id/bid", controller.bid.bind(controller));
router.patch("/:id/commit", controller.commit.bind(controller));
router.patch("/:id/status", controller.updateStatus.bind(controller));

export default router;
