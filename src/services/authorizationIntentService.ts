import crypto from "crypto";
import { Request } from "express";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { AuthorizationIntentModel } from "../database/models/authorizationIntent";
import { AuthPasskeyModel } from "../database/models/authPasskey";
import { getAuthModelForRole, normalizeAuthRole } from "./authService";
import { sendOtpEmail } from "../utils/mailer";
import { JWT_SECRET } from "../config";

const TTL_MS = 5 * 60 * 1000;
const secret = () => String(process.env.AUTHORIZATION_SECRET || JWT_SECRET || "");
const normalized = (value: any): any => Array.isArray(value) ? value.map(normalized) : value && typeof value === "object"
  ? Object.keys(value).sort().reduce((out: any, key) => { out[key] = normalized(value[key]); return out; }, {}) : value;
export const authorizationPayloadHash = (payload: any) => crypto.createHash("sha256").update(JSON.stringify(normalized(payload || {}))).digest("hex");
const otpDigest = (intentId: any, code: string) => crypto.createHmac("sha256", secret()).update(`${intentId}:${code}`).digest("hex");
const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const origin = (req: Request) => String(process.env.WEBAUTHN_ORIGIN || req.headers.origin || "").split(",").map(v => v.trim()).filter(Boolean);
const rpId = (req: Request) => String(process.env.WEBAUTHN_RP_ID || (() => { try { return new URL(String(req.headers.origin)).hostname; } catch { return String(req.headers.host || "localhost").replace(/:\d+$/, ""); } })());
const base64UrlToBuffer = (value: string) => Uint8Array.from(Buffer.from(value, "base64url"));

export const createAuthorizationIntent = async (req: Request, action: string, payload: any, companyId?: any, idempotencyKey?: string) => {
  const actorId = req.user?.id, actorRole = normalizeAuthRole(req.user?.role);
  if (!actorId || !actorRole) throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  const hash = authorizationPayloadHash(payload);
  if (idempotencyKey) {
    const existing: any = await AuthorizationIntentModel.findOne({ actorId, idempotencyKey });
    if (existing) {
      if (existing.action !== action || existing.payloadHash !== hash) throw Object.assign(new Error("Idempotency key was already used for different authorization details."), { statusCode: 409 });
      return existing;
    }
  }
  return AuthorizationIntentModel.create({ actorId, actorRole, companyId: companyId || null, action, payloadHash: hash, payload, idempotencyKey: idempotencyKey || null, expiresAt: new Date(Date.now() + TTL_MS), audit: [{ event: "CREATED" }] });
};

const loadPending = async (req: Request, intentId: string, includeSecrets = false) => {
  let query: any = AuthorizationIntentModel.findOne({ _id: intentId, actorId: req.user?.id });
  if (includeSecrets) query = query.select("+payload +challenge +otpDigest +otpAttempts");
  const row: any = await query;
  if (!row) throw Object.assign(new Error("Authorization request not found."), { statusCode: 404 });
  if (row.expiresAt <= new Date()) { row.status = "EXPIRED"; await row.save(); throw Object.assign(new Error("Authorization request expired."), { statusCode: 410 }); }
  if (row.status !== "PENDING") throw Object.assign(new Error("Authorization request is no longer pending."), { statusCode: 409 });
  return row;
};

export const requestAuthorizationOtp = async (req: Request, intentId: string) => {
  const row: any = await loadPending(req, intentId, true);
  if (row.otpSentAt && Date.now() - new Date(row.otpSentAt).getTime() < 60_000) throw Object.assign(new Error("Wait before requesting another code."), { statusCode: 429 });
  const { canonicalRole, model } = getAuthModelForRole(row.actorRole);
  const user: any = await model.findById(row.actorId).select("email isEmailVerified").lean();
  if (!user?.email || user.isEmailVerified === false) throw Object.assign(new Error("A verified account email is required."), { statusCode: 409 });
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  row.otpDigest = otpDigest(row._id, code); row.otpAttempts = 0; row.otpSentAt = new Date(); row.audit.push({ event: "OTP_SENT" }); await row.save();
  await sendOtpEmail(user.email, code, "en", canonicalRole, "verification_otp");
  return { maskedEmail: String(user.email).replace(/^(.).+(@.*)$/, "$1••••$2"), expiresInSeconds: Math.max(0, Math.floor((row.expiresAt.getTime() - Date.now()) / 1000)), resendInSeconds: 60 };
};

export const verifyAuthorizationOtp = async (req: Request, intentId: string, code: string) => {
  const row: any = await loadPending(req, intentId, true);
  row.otpAttempts += 1;
  if (row.otpAttempts > 5) { row.status = "FAILED"; row.audit.push({ event: "OTP_ATTEMPTS_EXCEEDED" }); await row.save(); throw Object.assign(new Error("Too many verification attempts."), { statusCode: 429 }); }
  if (!/^\d{6}$/.test(code) || !row.otpDigest || !safeEqual(row.otpDigest, otpDigest(row._id, code))) { row.audit.push({ event: "OTP_FAILED" }); await row.save(); throw Object.assign(new Error("Invalid verification code."), { statusCode: 400 }); }
  row.status = "VERIFIED"; row.authenticationMethod = "EMAIL_OTP"; row.verifiedAt = new Date(); row.otpDigest = ""; row.audit.push({ event: "VERIFIED", metadata: { method: "EMAIL_OTP" } }); await row.save(); return row;
};

export const authorizationPasskeyOptions = async (req: Request, intentId: string) => {
  const row: any = await loadPending(req, intentId, true);
  const keys = await AuthPasskeyModel.find({ userId: row.actorId, role: row.actorRole, revokedAt: null }).lean();
  if (!keys.length) throw Object.assign(new Error("No passkey is registered for this account."), { statusCode: 409 });
  const options = await generateAuthenticationOptions({ rpID: rpId(req), userVerification: "required", allowCredentials: keys.map((key: any) => ({ id: key.credentialId, transports: key.transports || undefined })) });
  row.challenge = options.challenge; row.audit.push({ event: "PASSKEY_CHALLENGE_CREATED" }); await row.save(); return options;
};

export const verifyAuthorizationPasskey = async (req: Request, intentId: string, response: any) => {
  const row: any = await loadPending(req, intentId, true);
  const key: any = await AuthPasskeyModel.findOne({ userId: row.actorId, role: row.actorRole, credentialId: response?.id, revokedAt: null });
  if (!key || !row.challenge) throw Object.assign(new Error("Passkey verification failed."), { statusCode: 400 });
  const result = await verifyAuthenticationResponse({ response, expectedChallenge: row.challenge, expectedOrigin: origin(req), expectedRPID: rpId(req), credential: { id: key.credentialId, publicKey: base64UrlToBuffer(key.publicKey), counter: Number(key.counter || 0), transports: key.transports as any }, requireUserVerification: true });
  if (!result.verified) throw Object.assign(new Error("Passkey verification failed."), { statusCode: 400 });
  key.counter = result.authenticationInfo.newCounter; key.lastUsedAt = new Date(); await key.save();
  row.status = "VERIFIED"; row.authenticationMethod = "PASSKEY"; row.verifiedAt = new Date(); row.challenge = ""; row.audit.push({ event: "VERIFIED", metadata: { method: "PASSKEY" } }); await row.save(); return row;
};

export const consumeAuthorizationIntent = async (req: Request, intentId: string, action: string, payload: any) => {
  const hash = authorizationPayloadHash(payload);
  const row: any = await AuthorizationIntentModel.findOneAndUpdate({ _id: intentId, actorId: req.user?.id, action, payloadHash: hash, status: "VERIFIED", expiresAt: { $gt: new Date() } }, { $set: { status: "CONSUMED", consumedAt: new Date() }, $push: { audit: { event: "CONSUMED", at: new Date() } } }, { new: true });
  if (!row) throw Object.assign(new Error("Fresh authorization is required or the approved details changed."), { statusCode: 401, code: "FRESH_AUTH_REQUIRED" });
  return row;
};
