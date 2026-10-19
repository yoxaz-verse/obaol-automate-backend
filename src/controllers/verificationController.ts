import { Request, Response } from "express";
import { VerificationModel } from "../database/models/verification";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";
import { AdminModel } from "../database/models/admin";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import verificationService from "../services/verification.service";
import { toBlockedResponsePayload } from "../utils/preAuthGuard";
import { getAuthNextPath, issueAuthCookie, normalizeAuthRole } from "../services/authService";

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

    if (req.user?.authStage === "email_verification" && method === "email" && (userType === "Associate" || userType === "Operator")) {
      await issueAuthCookie(res, { _id: userId, email: req.user?.email, role: userType }, false);
    }

    const verifiedUser = userType === "Associate"
      ? await AssociateModel.findById(userId).select("onboardingComplete registrationStatus").lean()
      : userType === "Operator"
        ? await OperatorModel.findById(userId).select("onboardingComplete registrationStatus").lean()
        : req.user;

    res.status(200).json({
      success: true,
      role: userType,
      next: getAuthNextPath(verifiedUser, userType),
      message: "Email verified successfully.",
    });
  } catch (error: any) {
    res.status(400).json({ success: false, code: "OTP_EXPIRED", message: "Invalid or expired verification code." });
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
  const safeResponse = { success: true, message: "If this email is eligible, a verification code has been sent." };

  if (!email || normalizedMethod !== "email") {
    return res.status(400).json({ success: false, code: "INVALID_REQUEST", message: "A valid email is required." });
  }

  try {
    const found = await findUserByEmail(String(email));
    if (found && (found.userType === "Associate" || found.userType === "Operator") && !toBlockedResponsePayload(found)) {
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
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(safeResponse);
  } catch (error: any) {
    return res.status(200).json(safeResponse);
  }
};

export const verifyOtpForExistingEmail = async (req: Request, res: Response) => {
  const { code, method, email, rememberMe } = req.body || {};
  const normalizedMethod = String(method || "email").toLowerCase();
  if (!email || !code || normalizedMethod !== "email") {
    return res.status(400).json({ success: false, code: "OTP_EXPIRED", message: "Invalid or expired verification code." });
  }
  try {
    const found = await findUserByEmail(String(email));
    if (!found) {
      return res.status(400).json({ success: false, code: "OTP_EXPIRED", message: "Invalid or expired verification code." });
    }
    await verificationService.verify(found.id, found.userType, String(code), "email");
    if (found.userType === "Associate" || found.userType === "Operator") {
      const blockedPayload = toBlockedResponsePayload(found);
      if (blockedPayload) {
        return res.status(403).json({ ...blockedPayload, code: "ACCOUNT_BLOCKED" });
      }
    }
    const normalizedRole = String(found.userType || "").trim();
    if (normalizedRole === "Associate" || normalizedRole === "Operator") {
      await issueAuthCookie(res, { _id: found.id, email: found.email, role: normalizedRole }, Boolean(rememberMe));
      const registrationStatus = String(found.registrationStatus || "APPROVED").toUpperCase();
      const next = found.onboardingComplete === false
        ? "/dashboard/onboarding"
        : registrationStatus !== "APPROVED"
          ? "/dashboard/pending-approval"
          : "/dashboard";
      return res.status(200).json({
        success: true,
        next,
        user: { id: found.id, email: found.email, role: normalizedRole, registrationStatus },
      });
    }
    return res.status(200).json({ success: true, next: "/auth" });
  } catch (error: any) {
    return res.status(400).json({ success: false, code: "OTP_EXPIRED", message: "Invalid or expired verification code." });
  }
};
