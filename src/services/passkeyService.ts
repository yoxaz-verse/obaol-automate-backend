import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { AuthChallengeModel } from "../database/models/authChallenge";
import { AuthPasskeyModel } from "../database/models/authPasskey";
import { VerificationModel } from "../database/models/verification";
import logger from "../utils/apiLogger";
import {
  getAuthModelForRole,
  issueAuthCookie,
  normalizeAuthRole,
} from "./authService";

const PASSKEY_CHALLENGE_TTL_MS = 3 * 60 * 1000;
const PASSKEY_UNAVAILABLE_MESSAGE = "Passkey sign-in is not available for this account.";

const bufferToBase64Url = (value: Uint8Array | ArrayBuffer) =>
  Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value).toString("base64url");

const base64UrlToBuffer = (value: string) => Uint8Array.from(Buffer.from(value, "base64url"));

const requestOrigin = (req: Request) => {
  const configured = String(process.env.WEBAUTHN_ORIGIN || process.env.FRONTEND_URL || "").trim();
  if (configured) return configured.split(",").map((item) => item.trim()).filter(Boolean);
  const origin = String(req.headers.origin || "").trim();
  if (origin) return origin;
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0];
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0];
  return `${proto}://${host}`;
};

const requestRpId = (req: Request) => {
  const configured = String(process.env.WEBAUTHN_RP_ID || "").trim();
  if (configured) return configured;
  const origin = String(req.headers.origin || "").trim();
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin.replace(/^https?:\/\//i, "").replace(/:\d+$/, "");
    }
  }
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0];
  return host.replace(/:\d+$/, "");
};

const normalizeEmail = (email: any) => String(email || "").trim().toLowerCase();

const getUserForRole = async (role: any, email?: any, id?: any) => {
  const { canonicalRole, model } = getAuthModelForRole(role);
  if (!canonicalRole || !model) return { canonicalRole: "", user: null };
  const query = id ? { _id: id } : { email: normalizeEmail(email) };
  const user = await model.findOne(query);
  return { canonicalRole, user };
};

const isAccountAllowed = (user: any, role: string) => {
  if (!user || user.isDeleted || user.isActive === false) return false;
  const registrationStatus = String(user.registrationStatus || "APPROVED").toUpperCase();
  if ((role === "Associate" || role === "Operator") && registrationStatus === "REJECTED") return false;
  return true;
};

const consumeLatestChallenge = async (userId: any, role: string, purpose: string) => {
  const challenge = await AuthChallengeModel.findOne({
    userId,
    role,
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!challenge) return null;
  challenge.consumedAt = new Date();
  await challenge.save();
  return challenge;
};

const storeChallenge = async (userId: any, role: string, purpose: string, challenge: string, webAuthnUserId = "") => {
  await AuthChallengeModel.updateMany(
    { userId, role, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );
  await AuthChallengeModel.create({
    userId,
    role,
    purpose,
    challenge,
    webAuthnUserId,
    expiresAt: new Date(Date.now() + PASSKEY_CHALLENGE_TTL_MS),
  });
};

const verifyEnrollmentGate = async (user: any, role: string, password: any, otpCode: any) => {
  if (!password || !otpCode) {
    return { ok: false, status: 400, message: "Password and email OTP are required to manage passkeys." };
  }
  const passwordOk = await user.comparePassword(String(password));
  if (!passwordOk) {
    return { ok: false, status: 401, message: "Invalid credentials." };
  }
  const record = await VerificationModel.findOne({
    userId: String(user._id),
    userType: role,
    method: "email",
    code: String(otpCode),
    verified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!record) {
    return { ok: false, status: 400, message: "Invalid or expired OTP." };
  }
  record.verified = true;
  await record.save();
  return { ok: true };
};

export const listPasskeys = async (req: Request, res: Response) => {
  const role = normalizeAuthRole(req.user?.role);
  const userId = req.user?.id;
  if (!role || !userId) return res.status(401).json({ success: false, message: "Authentication required." });
  const passkeys = await AuthPasskeyModel.find({ userId, role, revokedAt: null })
    .select("credentialId deviceLabel transports deviceType backedUp createdAt lastUsedAt")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ success: true, passkeys });
};

export const generatePasskeyRegistrationOptions = async (req: Request, res: Response) => {
  try {
    const role = normalizeAuthRole(req.user?.role);
    const userId = req.user?.id;
    const { password, otpCode, deviceLabel } = req.body || {};
    const { user } = await getUserForRole(role, undefined, userId);
    if (!role || !user || !isAccountAllowed(user, role)) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const gate = await verifyEnrollmentGate(user, role, password, otpCode);
    if (!gate.ok) return res.status(gate.status || 400).json({ success: false, message: gate.message });

    const existingPasskeys = await AuthPasskeyModel.find({ userId: user._id, role, revokedAt: null }).lean();
    const webAuthnUserId = existingPasskeys[0]?.webAuthnUserId || bufferToBase64Url(new mongoose.Types.ObjectId().id);
    const options = await generateRegistrationOptions({
      rpName: process.env.WEBAUTHN_RP_NAME || "OBAOL",
      rpID: requestRpId(req),
      userID: base64UrlToBuffer(webAuthnUserId),
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: "none",
      excludeCredentials: existingPasskeys.map((passkey: any) => ({
        id: passkey.credentialId,
        transports: passkey.transports || undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
      supportedAlgorithmIDs: [-7, -257],
    });
    await storeChallenge(user._id, role, "PASSKEY_REGISTRATION", options.challenge, webAuthnUserId);
    return res.json({ success: true, options, deviceLabel: String(deviceLabel || "Passkey").slice(0, 80) });
  } catch (error: any) {
    logger.warn("Passkey registration options failed", { error: error?.message || error });
    return res.status(400).json({ success: false, message: "Unable to start passkey registration." });
  }
};

export const verifyPasskeyRegistration = async (req: Request, res: Response) => {
  try {
    const role = normalizeAuthRole(req.user?.role);
    const userId = req.user?.id;
    const { response, deviceLabel } = req.body || {};
    const { user } = await getUserForRole(role, undefined, userId);
    if (!role || !user || !isAccountAllowed(user, role) || !response) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const challengeRecord = await consumeLatestChallenge(user._id, role, "PASSKEY_REGISTRATION");
    if (!challengeRecord) return res.status(400).json({ success: false, message: "Passkey challenge expired. Try again." });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: requestOrigin(req),
      expectedRPID: requestRpId(req),
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ success: false, message: "Passkey registration could not be verified." });
    }
    const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;
    await AuthPasskeyModel.create({
      userId: user._id,
      role,
      credentialId: credential.id,
      webAuthnUserId: challengeRecord.webAuthnUserId,
      publicKey: bufferToBase64Url(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports || response.response?.transports || [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      deviceLabel: String(deviceLabel || "Passkey").trim().slice(0, 80) || "Passkey",
    });
    logger.info("Passkey registered", { userId: String(user._id), role, credentialId: credential.id });
    return res.json({ success: true, verified: true });
  } catch (error: any) {
    logger.warn("Passkey registration verify failed", { error: error?.message || error });
    return res.status(400).json({ success: false, message: "Passkey registration failed." });
  }
};

export const generatePasskeyAuthenticationOptions = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body || {};
    const { canonicalRole, user } = await getUserForRole(role, email);
    if (!canonicalRole || !user || !isAccountAllowed(user, canonicalRole)) {
      return res.status(400).json({ success: false, message: PASSKEY_UNAVAILABLE_MESSAGE });
    }
    const passkeys = await AuthPasskeyModel.find({ userId: user._id, role: canonicalRole, revokedAt: null }).lean();
    if (!passkeys.length) {
      return res.status(400).json({ success: false, message: PASSKEY_UNAVAILABLE_MESSAGE });
    }
    const options = await generateAuthenticationOptions({
      rpID: requestRpId(req),
      userVerification: "required",
      allowCredentials: passkeys.map((passkey: any) => ({
        id: passkey.credentialId,
        transports: passkey.transports || undefined,
      })),
    });
    await storeChallenge(user._id, canonicalRole, "PASSKEY_AUTHENTICATION", options.challenge);
    return res.json({ success: true, options });
  } catch (error: any) {
    logger.warn("Passkey authentication options failed", { error: error?.message || error });
    return res.status(400).json({ success: false, message: PASSKEY_UNAVAILABLE_MESSAGE });
  }
};

export const verifyPasskeyAuthentication = async (req: Request, res: Response) => {
  try {
    const { email, role, response, rememberMe } = req.body || {};
    const { canonicalRole, user } = await getUserForRole(role, email);
    if (!canonicalRole || !user || !isAccountAllowed(user, canonicalRole) || !response?.id) {
      return res.status(400).json({ success: false, message: "Passkey sign-in failed." });
    }
    const passkey = await AuthPasskeyModel.findOne({
      userId: user._id,
      role: canonicalRole,
      credentialId: response.id,
      revokedAt: null,
    });
    if (!passkey) return res.status(400).json({ success: false, message: "Passkey sign-in failed." });

    const challengeRecord = await consumeLatestChallenge(user._id, canonicalRole, "PASSKEY_AUTHENTICATION");
    if (!challengeRecord) return res.status(400).json({ success: false, message: "Passkey challenge expired. Try again." });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: requestOrigin(req),
      expectedRPID: requestRpId(req),
      credential: {
        id: passkey.credentialId,
        publicKey: base64UrlToBuffer(passkey.publicKey),
        counter: Number(passkey.counter || 0),
        transports: passkey.transports as any,
      },
      requireUserVerification: true,
    });
    if (!verification.verified) {
      return res.status(400).json({ success: false, message: "Passkey sign-in failed." });
    }
    passkey.counter = verification.authenticationInfo.newCounter;
    passkey.lastUsedAt = new Date();
    await passkey.save();

    issueAuthCookie(res, { ...user.toObject(), role: canonicalRole }, Boolean(rememberMe));
    logger.info("Passkey login succeeded", { userId: String(user._id), role: canonicalRole });
    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: canonicalRole,
        registrationStatus: user.registrationStatus || null,
      },
    });
  } catch (error: any) {
    logger.warn("Passkey authentication verify failed", { error: error?.message || error });
    return res.status(400).json({ success: false, message: "Passkey sign-in failed." });
  }
};

export const deletePasskey = async (req: Request, res: Response) => {
  try {
    const role = normalizeAuthRole(req.user?.role);
    const userId = req.user?.id;
    const { password, otpCode } = req.body || {};
    const { user } = await getUserForRole(role, undefined, userId);
    if (!role || !user) return res.status(401).json({ success: false, message: "Authentication required." });
    const gate = await verifyEnrollmentGate(user, role, password, otpCode);
    if (!gate.ok) return res.status(gate.status || 400).json({ success: false, message: gate.message });

    const result = await AuthPasskeyModel.findOneAndUpdate(
      { credentialId: req.params.credentialId, userId: user._id, role, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { new: true }
    );
    if (!result) return res.status(404).json({ success: false, message: "Passkey not found." });
    logger.info("Passkey revoked", { userId: String(user._id), role, credentialId: req.params.credentialId });
    return res.json({ success: true });
  } catch (error: any) {
    logger.warn("Passkey deletion failed", { error: error?.message || error });
    return res.status(400).json({ success: false, message: "Unable to remove passkey." });
  }
};
