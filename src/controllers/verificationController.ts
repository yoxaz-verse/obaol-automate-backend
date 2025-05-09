import VerificationRepository from "../database/repositories/verificationRepository";
// controllers/VerificationController.ts

import { getUserModel } from "../utils/userModelMapper";
import verificationService from "../services/verificationService";
import { Request, Response } from "express";

export const sendOTP = async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"] || "unknown";
  console.log("Over Here");

  const userId = req.user?.id;
  const userType = req.user?.role;
  const { method } = req.body;

  if (!userId || !userType || !method) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    await verificationService.initiateVerification(
      userId,
      userType,
      method,
      ip?.toString() ?? "unknown",
      userAgent
    );
    res.status(200).json({ message: `OTP sent to ${userType}` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userId = req.user?.id;
  const userType = req.user?.role;
  const { code, method } = req.body;

  if (!userId || !userType || !method || !code) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    await verificationService.verify(userId, userType, code, method);
    res.status(200).json({ message: `${userType} verified successfully` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const checkVerificationStatus = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userType = req.user?.role;
  const { method } = req.body;

  if (!userId || !method || !userType) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    const record = await VerificationRepository.findCode(
      userId,
      userType,
      method
    );

    const verified = record?.verified === true;
    return res.status(200).json({ verified });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
