import { Request, Response } from "express";
import { generateJWTToken } from "../utils/tokenUtils";
import { getAuthCookieOptions } from "../utils/cookieOptions";
import { VerificationModel } from "../database/models/verification";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";
import { AdminModel } from "../database/models/admin";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import verificationService from "../services/verification.service";
import { toBlockedResponsePayload } from "../utils/preAuthGuard";
import { normalizeAuthRole } from "../services/authService";

export const sendOTP = async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"] || "unknown";

  const userId = req.user?.id;
  const userType = normalizeAuthRole(req.user?.role);
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
      req.language,
      { authEmailType: "signup_otp" }
    );
    res.status(200).json({ message: `OTP sent to ${userType}` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userType = normalizeAuthRole(req.user?.role);
  const { code, method } = req.body;

  if (!userId || !userType || !method || !code) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    await verificationService.verify(userId, userType, code, method);

    if (userType === "Associate") {
      const updatePayload: any = {};
      if (method === "email") updatePayload.isEmailVerified = true;
      if (method === "phone") updatePayload.isPhoneVerified = true;

      await AssociateModel.findByIdAndUpdate(userId, updatePayload);
    }
    if (userType === "Operator" && method === "email") {
      await OperatorModel.findByIdAndUpdate(userId, { isEmailVerified: true });
    }

    res.status(200).json({ message: `${userType} verified successfully` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const checkVerificationStatus = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userType = normalizeAuthRole(req.user?.role);
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

const findUserByEmail = async (email: string) => {
  const emailLower = String(email || "").trim().toLowerCase();
  if (!emailLower) return null;
  const [admin, inventoryManager, operator, associate] = await Promise.all([
    AdminModel.findOne({ email: emailLower }).select("_id email").lean(),
    InventoryManagerModel.findOne({ email: emailLower }).select("_id email").lean(),
    OperatorModel.findOne({ email: emailLower }).select("_id email onboardingComplete isDeleted registrationStatus isActive reviewNotes").lean(),
    AssociateModel.findOne({ email: emailLower }).select("_id email onboardingComplete isDeleted registrationStatus isActive reviewNotes").lean(),
  ]);
  if (admin) return { id: String(admin._id), userType: "Admin", email: admin.email };
  if (inventoryManager) return { id: String(inventoryManager._id), userType: "InventoryManager", email: inventoryManager.email };
  if (operator) {
    return {
      id: String(operator._id),
      userType: "Operator",
      email: operator.email,
      onboardingComplete: operator.onboardingComplete,
      isDeleted: operator.isDeleted,
      registrationStatus: operator.registrationStatus,
      isActive: operator.isActive,
      reviewNotes: operator.reviewNotes,
    };
  }
  if (associate) {
    return {
      id: String(associate._id),
      userType: "Associate",
      email: associate.email,
      onboardingComplete: associate.onboardingComplete,
      isDeleted: associate.isDeleted,
      registrationStatus: associate.registrationStatus,
      isActive: associate.isActive,
      reviewNotes: associate.reviewNotes,
    };
  }
  return null;
};

export const sendOtpForExistingEmail = async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"] || "unknown";
  const { method, email } = req.body || {};
  const normalizedMethod = String(method || "email").toLowerCase();
  const safeResponse = { message: "If an account exists for this email, an OTP has been sent." };

  if (!email || normalizedMethod !== "email") {
    return res.status(200).json(safeResponse);
  }

  try {
    const found = await findUserByEmail(String(email));
    if (found && (found.userType === "Associate" || found.userType === "Operator")) {
      const blockedPayload = toBlockedResponsePayload(found);
      if (blockedPayload) {
        return res.status(403).json(blockedPayload);
      }
    }
    if (found) {
      await verificationService.initiateVerification(
        found.id,
        found.userType,
        "email",
        ip?.toString() ?? "unknown",
        userAgent?.toString() ?? "unknown",
        found.email,
        req.language,
        { authEmailType: "signin_otp" }
      );
    }
    return res.status(200).json(safeResponse);
  } catch (error: any) {
    return res.status(200).json(safeResponse);
  }
};

export const verifyOtpForExistingEmail = async (req: Request, res: Response) => {
  const { code, method, email } = req.body || {};
  const normalizedMethod = String(method || "email").toLowerCase();
  if (!email || !code || normalizedMethod !== "email") {
    return res.status(400).json({ message: "Invalid or expired OTP." });
  }
  try {
    const found = await findUserByEmail(String(email));
    if (!found) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }
    if (found.userType === "Associate" || found.userType === "Operator") {
      const blockedPayload = toBlockedResponsePayload(found);
      if (blockedPayload) {
        return res.status(403).json(blockedPayload);
      }
    }
    await verificationService.verify(found.id, found.userType, String(code), "email");
    const normalizedRole = String(found.userType || "").trim();
    if (normalizedRole === "Associate" || normalizedRole === "Operator") {
      if (found.onboardingComplete === false) {
        const token = generateJWTToken(
          { _id: found.id, email: found.email, role: normalizedRole } as any,
          "2h"
        );
        const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
        const cookieOptions = getAuthCookieOptions(host, 2 * 60 * 60 * 1000);
        res.setHeader("Cache-Control", "no-store");
        res.cookie("auth_token", token, cookieOptions);
        return res.status(200).json({ success: true, next: "/dashboard/onboarding" });
      }
      const next = normalizedRole === "Operator" ? "/auth/operator" : "/auth";
      return res.status(200).json({ success: true, next });
    }
    return res.status(200).json({ success: true, next: "/auth" });
  } catch (error: any) {
    return res.status(400).json({ message: "Invalid or expired OTP." });
  }
};
