import { BaseService } from "../core/services/base.service";
import { VerificationModel } from "../database/models/verification";
import { sendOtpEmail } from "../utils/mailer";

class VerificationService extends BaseService {
    constructor() {
        super();
    }

    public async initiateVerification(userId: string, userType: any, method: "email" | "phone", ip: string, userAgent: string, email?: string) {
        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Save to DB
        await VerificationModel.create({
            userId,
            userType,
            method,
            code,
            expiresAt,
            ipAddress: ip,
            userAgent,
            verified: false
        });

        // Send Email if method is email
        if (method === "email" && email) {
            await sendOtpEmail(email, code);
        }

        return { success: true, message: `OTP sent to ${method}` };
    }

    public async verify(userId: string, userType: string, code: string, method: string) {
        const record = await VerificationModel.findOne({
            userId,
            userType,
            method,
            code,
            verified: false,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!record) {
            throw new Error("Invalid or expired OTP");
        }

        record.verified = true;
        await record.save();

        return true;
    }
}

export default new VerificationService();
