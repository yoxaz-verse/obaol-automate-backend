import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { otpLimiter, passkeyLimiter } from "../../middlewares/rateLimiter";
import { AuthorizationIntentController } from "../../controllers/authorizationIntentController";

const router = Router(), controller = new AuthorizationIntentController();
router.use(authenticateToken);
router.post("/", controller.create.bind(controller));
router.post("/:id/otp", otpLimiter, controller.otp.bind(controller));
router.post("/:id/otp/verify", otpLimiter, controller.verifyOtp.bind(controller));
router.post("/:id/passkey/options", passkeyLimiter, controller.passkeyOptions.bind(controller));
router.post("/:id/passkey/verify", passkeyLimiter, controller.verifyPasskey.bind(controller));
export default router;
