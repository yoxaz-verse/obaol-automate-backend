// routes/verification.routes.ts

import authenticateToken, { authenticateEmailVerificationToken } from "../middlewares/auth";
import { otpLimiter } from "../middlewares/rateLimiter";
import {
  checkVerificationStatus,
  sendOTP,
  verifyOTP,
  sendOtpForExistingEmail,
  verifyOtpForExistingEmail,
} from "../controllers/verificationController";
import express from "express";

const router = express.Router();

router.post("/send-otp", otpLimiter, authenticateEmailVerificationToken, sendOTP);
router.post("/verify-otp", otpLimiter, authenticateEmailVerificationToken, verifyOTP);
router.post("/status", authenticateToken, checkVerificationStatus);
router.post("/send-otp-existing", otpLimiter, sendOtpForExistingEmail);
router.post("/verify-otp-existing", otpLimiter, verifyOtpForExistingEmail);

export default router;
