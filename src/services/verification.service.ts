import { BaseService } from "../core/services/base.service";
import { VerificationModel } from "../database/models/verification";
import { sendOtpEmail } from "../utils/mailer";
import { AuthEmailTemplateType } from "../utils/authEmailTemplates";
import crypto from "crypto";
import { JWT_SECRET } from "../config";
import { sendWhatsappAuthenticationOtp } from "./whatsappService";

const normalizeMethod = (value: string) => value === "phone" ? "whatsapp" : value;
const digestCode = (userId: string, method: string, code: string) => crypto
  .createHmac("sha256", String(JWT_SECRET))
  .update(`${userId}:${normalizeMethod(method)}:${code}`)
  .digest("hex");

class VerificationService extends BaseService {
    constructor() {
        super();
    }

    public async initiateVerification(
      userId: string,
      userType: any,
      method: "email" | "phone" | "whatsapp",
      ip: string,
      userAgent: string,
      email?: string,
      lang: string = "en",
      context?: { authEmailType?: AuthEmailTemplateType; phone?: string }
    ) {
        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes expiry

        const normalizedMethod = normalizeMethod(method) as "email" | "whatsapp";
        const destination = normalizedMethod === "email" ? String(email || "").trim().toLowerCase() : String(context?.phone || "").trim();
        if (!destination) throw new Error(normalizedMethod === "email" ? "A registered email is required." : "A registered WhatsApp number is required.");
        await VerificationModel.updateMany({ userId, userType, method: { $in: normalizedMethod === "whatsapp" ? ["phone", "whatsapp"] : ["email"] }, verified: false }, { $set: { verified: true } });
        const record = await VerificationModel.create({
            userId,
            userType,
            method: normalizedMethod,
            codeDigest: digestCode(userId, normalizedMethod, code),
            destination,
            expiresAt,
            ipAddress: ip,
            userAgent,
            verified: false
        });

        // Send Email if method is email
        if (normalizedMethod === "email" && email) {
            try {
                await sendOtpEmail(email, code, lang, userType, context?.authEmailType || "verification_otp");
            } catch (error) {
                await VerificationModel.deleteOne({ _id: record._id }).catch(() => undefined);
                throw error;
            }
        }

        if (normalizedMethod === "whatsapp") {
            try {
                const metaMessageId = await sendWhatsappAuthenticationOtp(destination, code);
                record.metaMessageId = metaMessageId;
                (record as any).deliveryStatus = "SENT";
                await record.save();
            } catch (error) {
                await VerificationModel.deleteOne({ _id: record._id }).catch(() => undefined);
                throw error;
            }
        }

        return { success: true, message: `OTP sent to ${normalizedMethod}` };
    }

    public async verify(userId: string, userType: string, code: string, method: string) {
        const normalizedMethod = normalizeMethod(method);
        const candidates = await VerificationModel.find({
            userId,
            userType,
            method: { $in: normalizedMethod === "whatsapp" ? ["whatsapp", "phone"] : [normalizedMethod] },
            verified: false,
            expiresAt: { $gt: new Date() }
        }).select("+code +codeDigest +destination").sort({ createdAt: -1 }).limit(10);

        const expectedDigest = digestCode(userId, normalizedMethod, code);
        const record = candidates.find((candidate: any) => {
            if (candidate.codeDigest) {
                const left = Buffer.from(String(candidate.codeDigest));
                const right = Buffer.from(expectedDigest);
                return left.length === right.length && crypto.timingSafeEqual(left, right);
            }
            return candidate.code === code;
        });

        if (!record) {
            throw new Error("Invalid or expired OTP");
        }

        record.verified = true;
        await record.save();

        return { destination: String((record as any).destination || ""), method: normalizedMethod };
    }
}

export default new VerificationService();
