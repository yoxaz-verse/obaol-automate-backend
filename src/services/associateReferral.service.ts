import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export type ReferralActivationType = "LIVE_SUPPLY" | "INQUIRY_CREATED" | "INQUIRY_TAKEN";

const randomCode = (length = 8) =>
  Array.from({ length }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

export class AssociateReferralService {
  static normalizeCode(value: unknown) {
    return String(value || "").trim().toUpperCase();
  }

  static async generateCompanyReferralCode(length = 8) {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const code = randomCode(length);
      const [operatorExists, companyExists] = await Promise.all([
        OperatorModel.exists({ referralCode: code }),
        AssociateCompanyModel.exists({ referralCode: code }),
      ]);
      if (!operatorExists && !companyExists) return code;
    }
    throw new Error("Unable to generate a unique referral code.");
  }

  static async ensureCompanyCode(companyId: string | mongoose.Types.ObjectId) {
    const company = await AssociateCompanyModel.findById(companyId).select("referralCode");
    if (!company) return null;
    if ((company as any).referralCode) return String((company as any).referralCode);
    const referralCode = await this.generateCompanyReferralCode();
    const updated = await AssociateCompanyModel.findOneAndUpdate(
      { _id: company._id, $or: [{ referralCode: null }, { referralCode: { $exists: false } }] },
      { $set: { referralCode } },
      { new: true }
    ).select("referralCode");
    return String((updated as any)?.referralCode || (company as any).referralCode || referralCode);
  }

  static async resolveCode(rawCode: unknown) {
    const code = this.normalizeCode(rawCode);
    if (!code) return { type: "none" as const, code };
    const [operator, company] = await Promise.all([
      OperatorModel.findOne({ referralCode: code, isDeleted: { $ne: true } }).select("_id").lean(),
      AssociateCompanyModel.findOne({ referralCode: code, isDeleted: { $ne: true } }).select("_id").lean(),
    ]);
    if (operator && company) throw new Error("Referral code is ambiguous. Please contact support.");
    if (operator) return { type: "operator" as const, code, operatorId: operator._id };
    if (company) return { type: "associate_company" as const, code, companyId: company._id };
    return { type: "invalid" as const, code };
  }

  static async attachCompanyReferral(params: {
    companyId: string | mongoose.Types.ObjectId;
    referrerCompanyId: string | mongoose.Types.ObjectId;
    code: string;
  }) {
    const companyId = String(params.companyId);
    const referrerId = String(params.referrerCompanyId);
    if (companyId === referrerId) throw new Error("A company cannot refer itself.");
    const company = await AssociateCompanyModel.findById(companyId).select("referredByCompanyId");
    if (!company) throw new Error("Associate company not found.");
    if ((company as any).referredByCompanyId) throw new Error("This company already has a referrer.");
    const circular = await AssociateCompanyModel.exists({ _id: referrerId, referredByCompanyId: company._id });
    if (circular) throw new Error("Circular referrals are not allowed.");
    await AssociateCompanyModel.updateOne(
      { _id: company._id, referredByCompanyId: null },
      {
        $set: {
          referredByCompanyId: new mongoose.Types.ObjectId(referrerId),
          referralCodeUsed: this.normalizeCode(params.code),
          referralCapturedAt: new Date(),
        },
      }
    );
  }

  static async activateCompany(
    companyId: string | mongoose.Types.ObjectId | null | undefined,
    type: ReferralActivationType,
    entityId: string | mongoose.Types.ObjectId
  ) {
    if (!companyId || !mongoose.Types.ObjectId.isValid(String(companyId))) return false;
    const result = await AssociateCompanyModel.updateOne(
      {
        _id: companyId,
        referredByCompanyId: { $ne: null },
        referralActivatedAt: null,
        registrationStatus: "APPROVED",
        isApproved: true,
      },
      {
        $set: {
          referralActivatedAt: new Date(),
          referralActivationEvent: { type, entityId: new mongoose.Types.ObjectId(String(entityId)) },
        },
      }
    );
    return result.modifiedCount > 0;
  }

  static async activateForAssociate(
    associateId: string | mongoose.Types.ObjectId,
    type: ReferralActivationType,
    entityId: string | mongoose.Types.ObjectId
  ) {
    const associate = await AssociateModel.findById(associateId).select("associateCompany").lean();
    return this.activateCompany((associate as any)?.associateCompany, type, entityId);
  }

  static async getParticipantCompanyIds(inquiry: any) {
    const associateIds = [inquiry?.buyerAssociateId, inquiry?.sellerAssociateId, inquiry?.mediatorAssociateId]
      .filter(Boolean)
      .map(String);
    if (!associateIds.length) return [];
    const associates = await AssociateModel.find({ _id: { $in: associateIds } }).select("associateCompany").lean();
    return Array.from(new Set(associates.map((row: any) => String(row.associateCompany || "")).filter(Boolean)))
      .map((id) => new mongoose.Types.ObjectId(id));
  }
}
