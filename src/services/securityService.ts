import { Request, Response } from "express";
import { AuthSessionModel } from "../database/models/authSession";
import { VerificationModel } from "../database/models/verification";
import { getAuthModelForRole, normalizeAuthRole } from "./authService";

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const describeAgent = (value: string) => {
  const browser = /Edg\//.test(value) ? "Edge" : /OPR\//.test(value) ? "Opera" : /Chrome\//.test(value) ? "Chrome" : /Firefox\//.test(value) ? "Firefox" : /Safari\//.test(value) ? "Safari" : "Unknown browser";
  const os = /Windows/.test(value) ? "Windows" : /Android/.test(value) ? "Android" : /iPhone|iPad/.test(value) ? "iOS/iPadOS" : /Macintosh|Mac OS X/.test(value) ? "macOS" : /Linux/.test(value) ? "Linux" : "Unknown device";
  return { browser, device: os };
};

export const listSessions = async (req: Request, res: Response) => {
  const role = normalizeAuthRole(req.user?.role);
  const now = new Date();
  const sessions = await AuthSessionModel.find({ userId: req.user?.id, role, revokedAt: null, expiresAt: { $gt: now } })
    .sort({ lastActiveAt: -1 }).lean();
  return res.json({ success: true, sessions: sessions.map((session: any) => ({
    id: session.sessionId,
    ...describeAgent(session.userAgent || ""),
    location: session.location || "Unknown",
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    expiresAt: session.expiresAt,
    current: session.sessionId === req.user?.sessionId,
  })) });
};

export const revokeSession = async (req: Request, res: Response) => {
  if (req.params.sessionId === req.user?.sessionId) {
    return res.status(400).json({ success: false, message: "Use Sign Out to end your current session." });
  }
  const result = await AuthSessionModel.findOneAndUpdate(
    { sessionId: req.params.sessionId, userId: req.user?.id, role: normalizeAuthRole(req.user?.role), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  if (!result) return res.status(404).json({ success: false, message: "Active device not found." });
  return res.json({ success: true });
};

export const revokeOtherSessions = async (req: Request, res: Response) => {
  const query: any = { userId: req.user?.id, role: normalizeAuthRole(req.user?.role), revokedAt: null };
  if (req.user?.sessionId) query.sessionId = { $ne: req.user.sessionId };
  const result = await AuthSessionModel.updateMany(query, { $set: { revokedAt: new Date() } });
  return res.json({ success: true, revokedCount: result.modifiedCount });
};

export const changePassword = async (req: Request, res: Response) => {
  const role = normalizeAuthRole(req.user?.role);
  const { model } = getAuthModelForRole(role);
  const { currentPassword, newPassword, otpCode } = req.body || {};
  if (!model || !req.user?.id) return res.status(401).json({ success: false, message: "Authentication required." });
  if (!currentPassword || !newPassword || !otpCode) return res.status(400).json({ success: false, message: "Current password, new password, and email OTP are required." });
  if (!PASSWORD_PATTERN.test(String(newPassword))) return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include an uppercase letter and a number." });
  const user = await model.findById(req.user.id);
  if (!user || !(await user.comparePassword(String(currentPassword)))) return res.status(401).json({ success: false, message: "Current password is incorrect." });
  const verification = await VerificationModel.findOne({
    userId: String(user._id), userType: role, method: "email", code: String(otpCode), verified: false, expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!verification) return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
  verification.verified = true;
  await verification.save();
  user.password = String(newPassword);
  await user.save();
  await AuthSessionModel.updateMany({ userId: user._id, role, sessionId: { $ne: req.user.sessionId }, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return res.json({ success: true, message: "Password changed. Other devices have been signed out." });
};
