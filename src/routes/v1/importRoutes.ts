import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { ImportController } from "../../controllers/importController";

const router = Router();
const controller = new ImportController();

router.use(authenticateToken);

router.post("/", controller.createListing.bind(controller));
router.get("/", controller.listListings.bind(controller));
router.patch("/:id", controller.updateListing.bind(controller));
router.patch("/:id/close", controller.closeListing.bind(controller));
router.post("/:id/reservations", controller.createReservation.bind(controller));
router.patch("/:id/reservations/:reservationId/edit", controller.editReservation.bind(controller));
router.patch("/:id/reservations/:reservationId/cancel", controller.cancelReservation.bind(controller));
router.patch("/:id/reservations/:reservationId/lock", controller.lockReservation.bind(controller));

export default router;
