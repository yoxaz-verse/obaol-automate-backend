// routes/verification.routes.ts

import authenticateToken from "../middlewares/auth";
import {
  checkVerificationStatus,
  sendOTP,
  verifyOTP,
} from "../controllers/verificationController";
import express from "express";

const router = express.Router();

router.post("/send-otp", authenticateToken, sendOTP);
router.post("/verify-otp", authenticateToken, verifyOTP);
router.post("/status", authenticateToken, checkVerificationStatus);

export default router;
