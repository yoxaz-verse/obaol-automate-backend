import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { WhatsappController } from "../../controllers/whatsappController";
const router = Router(), controller = new WhatsappController();
router.get("/webhook", controller.verifyWebhook.bind(controller)); router.post("/webhook", controller.webhook.bind(controller));
router.get("/status", authenticateToken, controller.status.bind(controller)); router.post("/signup", authenticateToken, controller.signup.bind(controller)); router.post("/complete", authenticateToken, controller.complete.bind(controller)); router.post("/test", authenticateToken, controller.test.bind(controller)); router.delete("/", authenticateToken, controller.disconnect.bind(controller));
export default router;
