import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { SampleRequestController } from "../../controllers/sampleRequestController";

const router = Router();
const controller = new SampleRequestController();

router.use(authenticateToken);

router.post("/", controller.create.bind(controller));
router.get("/", controller.list.bind(controller));
router.patch("/:id/quote", controller.quote.bind(controller));
router.patch("/:id/decision", controller.decision.bind(controller));
router.patch("/:id/markup", controller.markup.bind(controller));

export default router;
