// services/VerificationService.ts

import { sendOtpEmail } from "../utils/mailer";
import VerificationRepository from "../database/repositories/verificationRepository";
import { getUserModel } from "../utils/userModelMapper";

class VerificationService {
  async initiateVerification(
    userId: string,
    userType: string,
    method: string,
    ip: string,
    userAgent: string
  ) {
    const Model = getUserModel(userType) as any;
    const user = await Model.findById(userId);
    if (!user) throw new Error(`${userType} not found`);

    // Check if already verified
    if (user?.verified?.[method] === true) {
      throw new Error(`${method} is already verified`);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (method === "email" && user.email) {
      await sendOtpEmail(user.email, code);
    }

    await VerificationRepository.saveCode(
      userId,
      userType,
      method,
      code,
      ip,
      userAgent
    );

    console.log(`OTP for ${userType} (${user.email || user.phone}): ${code}`);
  }

  async verify(userId: string, userType: string, code: string, method: string) {
    const record = await VerificationRepository.findCode(
      userId,
      userType,
      method
    );

    if (!record || record.code !== code) {
      throw new Error("Invalid or expired OTP");
    }

    const Model = getUserModel(userType) as any;
    const user = await Model.findById(userId);
    if (!user) throw new Error(`${userType} not found`);

    user.verified = {
      ...(user.verified || {}),
      [method]: true,
    };
    await user.save();

    await VerificationRepository.markAsVerified(userId, userType, method); // ✅ Now persistent
  }
}

export default new VerificationService();
