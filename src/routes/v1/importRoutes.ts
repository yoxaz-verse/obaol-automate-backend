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

export default router;

