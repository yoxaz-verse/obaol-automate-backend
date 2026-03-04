import { Request, Response } from "express";
import { VerificationModel } from "../database/models/verification";
import { AssociateModel } from "../database/models/associate";
import verificationService from "../services/verification.service";

export const sendOTP = async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"] || "unknown";

  const userId = req.user?.id;
  const userType = req.user?.role;
  const email = req.user?.email;
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
      userAgent?.toString() ?? "unknown",
      email,
      req.language
    );
    res.status(200).json({ message: `OTP sent to ${userType}` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userType = req.user?.role;
  const { code, method } = req.body;

  if (!userId || !userType || !method || !code) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    await verificationService.verify(userId, userType, code, method);

    // Sync verification status back to Associate model if applicable
    if (userType === "Associate") {
      const updatePayload: any = {};
      if (method === "email") updatePayload.isEmailVerified = true;
      if (method === "phone") updatePayload.isPhoneVerified = true;

      await AssociateModel.findByIdAndUpdate(userId, updatePayload);
    }

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
    const record = await VerificationModel.findOne({
      userId,
      userType,
      method
    }).sort({ createdAt: -1 });

    const verified = record?.verified === true;
    return res.status(200).json({ verified });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
