import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { SampleRequestController } from "../../controllers/sampleRequestController";

const router = Router();
const controller = new SampleRequestController();

router.use(authenticateToken);

router.post("/", controller.create.bind(controller));
router.get("/", controller.list.bind(controller));
router.get("/:id", controller.getById.bind(controller));
router.patch("/:id/quote", controller.quote.bind(controller));
router.patch("/:id/decision", controller.decision.bind(controller));
router.patch("/:id/markup", controller.markup.bind(controller));
router.patch("/:id/payment-received", controller.paymentReceived.bind(controller));
router.patch("/:id/packaging-start", controller.packagingStart.bind(controller));
router.patch("/:id/packaged", controller.packaged.bind(controller));
router.patch("/:id/courier-submit", controller.courierSubmit.bind(controller));
router.patch("/:id/in-transit", controller.inTransit.bind(controller));
router.patch("/:id/receipt-confirm", controller.receiptConfirm.bind(controller));

export default router;
