// repositories/VerificationRepository.ts

import { VerificationModel } from "../../database/models/verification";

class VerificationRepository {
  async saveCode(
    userId: string,
    userType: string,
    method: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await VerificationModel.findOneAndUpdate(
      { userId, userType, method },
      {
        code,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        ipAddress,
        userAgent,
      },
      { upsert: true, new: true }
    );
  }

  async findCode(userId: string, userType: string, method: string) {
    return VerificationModel.findOne({ userId, userType, method });
  }

  async deleteCode(userId: string, userType: string, method: string) {
    await VerificationModel.deleteOne({ userId, userType, method });
  }
  async markAsVerified(userId: string, userType: string, method: string) {
    await VerificationModel.findOneAndUpdate(
      { userId, userType, method },
      { verified: true }
    );
  }
}

export default new VerificationRepository();
