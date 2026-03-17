import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { ImportController } from "../../controllers/importController";

const router = Router();
const controller = new ImportController();

router.use(authenticateToken);

router.get("/", controller.listReservations.bind(controller));
router.patch("/:id/accept", controller.acceptReservation.bind(controller));
router.patch("/:id/reject", controller.rejectReservation.bind(controller));
router.patch("/:id/cancel", controller.cancelReservation.bind(controller));

export default router;

