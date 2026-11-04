import { Request, Response } from "express";
import { VerificationModel } from "../database/models/verification";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";
import { AdminModel } from "../database/models/admin";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import verificationService from "../services/verification.service";
import { toBlockedResponsePayload } from "../utils/preAuthGuard";
import { getAuthNextPath, issueAuthCookie, normalizeAuthRole } from "../services/authService";
import { accountVerificationStatus } from "../utils/accountVerification";
import { normalizePhoneInput } from "../utils/phone";

export const sendOTP = async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"] || "unknown";

  const userId = req.user?.id;
  const userType = normalizeAuthRole(req.user?.role);
  const email = req.user?.email;
  const method = String(req.body?.method || "email").toLowerCase() === "phone" ? "whatsapp" : String(req.body?.method || "email").toLowerCase();

  if (!userId || !userType || !method) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const model: any = userType === "Associate" ? AssociateModel : userType === "Operator" ? OperatorModel : null;
    const user: any = model ? await model.findById(userId).select("email phone").lean() : null;
    if (!user || !["email", "whatsapp"].includes(method)) return res.status(400).json({ success: false, message: "Invalid verification method." });
    await verificationService.initiateVerification(
      userId,
      userType,
      method as "email" | "whatsapp",
      ip?.toString() ?? "unknown",
      userAgent?.toString() ?? "unknown",
      user.email || email,
      req.language,
      { authEmailType: "signup_otp", phone: user.phone }
    );
    res.status(200).json({ message: `OTP sent to ${userType}` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userType = normalizeAuthRole(req.user?.role);
  const { code } = req.body;
  const method = String(req.body?.method || "email").toLowerCase() === "phone" ? "whatsapp" : String(req.body?.method || "email").toLowerCase();

  if (!userId || !userType || !method || !code) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const verifiedRecord = await verificationService.verify(userId, userType, code, method);
    if (method === "whatsapp") {
      const model: any = userType === "Associate" ? AssociateModel : userType === "Operator" ? OperatorModel : null;
      const current: any = model ? await model.findById(userId).select("phone").lean() : null;
      if (!current || String(current.phone) !== verifiedRecord.destination) throw new Error("The verified number is no longer current.");
    }

    if (userType === "Associate") {
      const updatePayload: any = {};
      if (method === "email") updatePayload.isEmailVerified = true;
      if (method === "whatsapp") updatePayload.isPhoneVerified = true;

      await AssociateModel.findByIdAndUpdate(userId, updatePayload);
    }
    if (userType === "Operator") {
      await OperatorModel.findByIdAndUpdate(userId, method === "email" ? { isEmailVerified: true } : { isPhoneVerified: true });
    }

    const verifiedUser = userType === "Associate"
      ? await AssociateModel.findById(userId).select("email phone isEmailVerified isPhoneVerified onboardingComplete registrationStatus createdAt").lean()
      : userType === "Operator"
        ? await OperatorModel.findById(userId).select("email phone isEmailVerified isPhoneVerified onboardingComplete registrationStatus createdAt").lean()
        : req.user;
    const status = accountVerificationStatus(verifiedUser);
    if (req.user?.authStage && status.fullyVerified && (userType === "Associate" || userType === "Operator")) {
      await issueAuthCookie(res, { _id: userId, email: req.user?.email, role: userType }, false);
    }

    res.status(200).json({
      success: true,
      role: userType,
      next: status.fullyVerified ? getAuthNextPath(verifiedUser, userType) : "/auth",
      verification: status,
      message: method === "email" ? "Email verified successfully." : "WhatsApp number verified successfully.",
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
    OperatorModel.findOne({ email: emailLower }).select("_id email phone onboardingComplete isDeleted registrationStatus isActive reviewNotes").lean(),
    AssociateModel.findOne({ email: emailLower }).select("_id email phone onboardingComplete isDeleted registrationStatus isActive reviewNotes").lean(),
  ]);
  if (admin) return { id: String(admin._id), userType: "Admin", email: admin.email };
  if (inventoryManager) return { id: String(inventoryManager._id), userType: "InventoryManager", email: inventoryManager.email };
  if (operator) {
    return {
      id: String(operator._id),
      userType: "Operator",
      email: operator.email,
      phone: operator.phone,
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
      phone: associate.phone,
      onboardingComplete: associate.onboardingComplete,
      isDeleted: associate.isDeleted,
      registrationStatus: associate.registrationStatus,
      isActive: associate.isActive,
      reviewNotes: associate.reviewNotes,
    };
  }
  return null;
};

const findUserByIdentifier = async (identifier: string) => {
  const raw = String(identifier || "").trim();
  if (raw.includes("@")) return findUserByEmail(raw);
  const phone = normalizePhoneInput({ rawPhone: raw }).e164;
  if (!phone) return null;
  const [operator, associate] = await Promise.all([
    OperatorModel.findOne({ phone }).select("_id email phone onboardingComplete isDeleted registrationStatus isActive reviewNotes").lean(),
    AssociateModel.findOne({ phone }).select("_id email phone onboardingComplete isDeleted registrationStatus isActive reviewNotes").lean(),
  ]);
  const found: any = operator || associate;
  if (!found) return null;
  return { id: String(found._id), userType: operator ? "Operator" : "Associate", email: found.email, phone: found.phone, onboardingComplete: found.onboardingComplete, isDeleted: found.isDeleted, registrationStatus: found.registrationStatus, isActive: found.isActive, reviewNotes: found.reviewNotes };
};

export const sendOtpForExistingEmail = async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"] || "unknown";
  const { method, email, identifier } = req.body || {};
  const normalizedMethod = String(method || "email").toLowerCase();
  const lookup = String(identifier || email || "").trim();
  const deliveryMethod = normalizedMethod === "phone" ? "whatsapp" : normalizedMethod;
  const safeResponse = { success: true, message: "If this email is eligible, a verification code has been sent." };

  if (!lookup || !["email", "whatsapp"].includes(deliveryMethod)) {
    return res.status(400).json({ success: false, code: "INVALID_REQUEST", message: "A valid account identifier is required." });
  }

  try {
    const found: any = await findUserByIdentifier(lookup);
    if (found && (found.userType === "Associate" || found.userType === "Operator") && !toBlockedResponsePayload(found)) {
      await verificationService.initiateVerification(
        found.id,
        found.userType,
        deliveryMethod as any,
        ip?.toString() ?? "unknown",
        userAgent?.toString() ?? "unknown",
        found.email,
        req.language,
        { authEmailType: "signin_otp", phone: found.phone }
      );
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(safeResponse);
  } catch (error: any) {
    return res.status(200).json(safeResponse);
  }
};

export const verifyOtpForExistingEmail = async (req: Request, res: Response) => {
  const { code, method, email, identifier, rememberMe } = req.body || {};
  const normalizedMethod = String(method || "email").toLowerCase();
  const deliveryMethod = normalizedMethod === "phone" ? "whatsapp" : normalizedMethod;
  const lookup = String(identifier || email || "").trim();
  if (!lookup || !code || !["email", "whatsapp"].includes(deliveryMethod)) {
    return res.status(400).json({ success: false, code: "OTP_EXPIRED", message: "Invalid or expired verification code." });
  }
  try {
    const found: any = await findUserByIdentifier(lookup);
    if (!found) {
      return res.status(400).json({ success: false, code: "OTP_EXPIRED", message: "Invalid or expired verification code." });
    }
    const verified = await verificationService.verify(found.id, found.userType, String(code), deliveryMethod);
    if (deliveryMethod === "whatsapp" && verified.destination !== found.phone) throw new Error("The verified number is no longer current.");
    if (found.userType === "Associate") await AssociateModel.findByIdAndUpdate(found.id, deliveryMethod === "email" ? { isEmailVerified: true } : { isPhoneVerified: true });
    if (found.userType === "Operator") await OperatorModel.findByIdAndUpdate(found.id, deliveryMethod === "email" ? { isEmailVerified: true } : { isPhoneVerified: true });
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
