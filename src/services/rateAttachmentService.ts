// src/services/rateAttachmentService.ts

import { IRateAttachment, RateAttachmentModel } from "../database/models/rateAttachmentModel";

class RateAttachmentService {
  /**
   * Create or update attachments for a variantRate in one shot.
   * If none exists, insert; otherwise, patch the arrays.
   */
  public async upsertAttachments(
    variantRateId: string,
    payload: Partial<
      Pick<IRateAttachment, "gstDocs" | "media" | "videos" | "certificates">
    >
  ): Promise<IRateAttachment> {
    return RateAttachmentModel.findOneAndUpdate(
      { variantRate: variantRateId },
      { $set: payload },
      { new: true, upsert: true }
    ).exec();
  }

  /** Fetch attachments by rate */
  public async getByVariantRate(
    variantRateId: string
  ): Promise<IRateAttachment | null> {
    return RateAttachmentModel.findOne({ variantRate: variantRateId })
      .populate("gstDocs media videos certificates")
      .exec();
  }

  /** Remove (delete) attachments doc entirely */
  public async deleteByVariantRate(variantRateId: string): Promise<void> {
    await RateAttachmentModel.deleteOne({ variantRate: variantRateId });
  }
}

export default new RateAttachmentService();
