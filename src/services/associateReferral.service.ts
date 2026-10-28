import mongoose from "mongoose";
import crypto from "crypto";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";
import { AssociateReferralInvitationModel } from "../database/models/associateReferralInvitation";
import {
  AssociateReferralActivityModel,
  ReferralActivityType,
} from "../database/models/associateReferralActivity";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export type ReferralActivationType = ReferralActivityType;

const INDIA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const indiaMonthWindow = (value: Date = new Date()) => {
  const indiaTime = new Date(value.getTime() + INDIA_OFFSET_MS);
  const year = indiaTime.getUTCFullYear();
  const month = indiaTime.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1) - INDIA_OFFSET_MS),
    end: new Date(Date.UTC(year, month + 1, 1) - INDIA_OFFSET_MS),
  };
};

const randomCode = (length = 8) =>
  Array.from({ length }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

export class AssociateReferralService {
  static tokenForInvitation(invitationId: string | mongoose.Types.ObjectId) {
    const secret = process.env.JWT_SECRET || "secret";
    return crypto.createHmac("sha256", secret).update(`associate-referral:${String(invitationId)}`).digest("hex");
  }

  static hashInvitationToken(token: string) {
    return crypto.createHash("sha256").update(String(token || "")).digest("hex");
  }

  static normalizeInvitationDestination(channel: string, value: unknown) {
    const destination = String(value || "").trim();
    if (channel === "LINK") return "";
    if (channel === "EMAIL") {
      const email = destination.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
      return email;
    }
    const phone = destination.replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw Object.assign(new Error("Enter a WhatsApp number with its international country code."), { status: 400 });
    return phone;
  }

  static async createInvitation(params: { referrerCompanyId: string; recipientName: unknown; channel: unknown; destination?: unknown; idempotencyKey: unknown }) {
    const recipientName = String(params.recipientName || "").trim();
    const channel = String(params.channel || "").trim().toUpperCase();
    const idempotencyKey = String(params.idempotencyKey || "").trim();
    if (!recipientName || recipientName.length > 160) throw Object.assign(new Error("Recipient name is required."), { status: 400 });
    if (!["EMAIL", "WHATSAPP", "LINK"].includes(channel)) throw Object.assign(new Error("Choose email, WhatsApp, or personal link."), { status: 400 });
    if (!idempotencyKey || idempotencyKey.length > 100) throw Object.assign(new Error("A valid idempotency key is required."), { status: 400 });
    const destination = this.normalizeInvitationDestination(channel, params.destination);
    let invitation: any = await AssociateReferralInvitationModel.findOne({ referrerCompanyId: params.referrerCompanyId, idempotencyKey });
    if (!invitation) {
      const _id = new mongoose.Types.ObjectId();
      const token = this.tokenForInvitation(_id);
      try {
        invitation = await AssociateReferralInvitationModel.create({
          _id, referrerCompanyId: params.referrerCompanyId, recipientName, channel, destination,
          idempotencyKey, tokenHash: this.hashInvitationToken(token),
        });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        invitation = await AssociateReferralInvitationModel.findOne({ referrerCompanyId: params.referrerCompanyId, idempotencyKey });
      }
    }
    return { invitation, token: this.tokenForInvitation(invitation._id) };
  }

  static async validateInvitation(token: unknown, expectedReferrerCompanyId: string | mongoose.Types.ObjectId) {
    const normalized = String(token || "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalized)) throw Object.assign(new Error("Invalid referral invitation."), { status: 400 });
    const invitation: any = await AssociateReferralInvitationModel.findOne({ tokenHash: this.hashInvitationToken(normalized) }).select("+tokenHash");
    if (!invitation || String(invitation.referrerCompanyId) !== String(expectedReferrerCompanyId)) {
      throw Object.assign(new Error("This invitation does not match the referral code."), { status: 400 });
    }
    if (invitation.joinedCompanyId) throw Object.assign(new Error("This referral invitation has already been used."), { status: 409 });
    return invitation;
  }

  static async claimInvitation(token: unknown, expectedReferrerCompanyId: string | mongoose.Types.ObjectId, joinedCompanyId: string | mongoose.Types.ObjectId) {
    const invitation = await this.validateInvitation(token, expectedReferrerCompanyId);
    const result = await AssociateReferralInvitationModel.updateOne(
      { _id: invitation._id, joinedCompanyId: null },
      { $set: { joinedCompanyId, joinedAt: new Date() } }
    );
    if (result.modifiedCount !== 1) throw Object.assign(new Error("This referral invitation has already been used."), { status: 409 });
    return invitation;
  }
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
    if (!entityId || !mongoose.Types.ObjectId.isValid(String(entityId))) return false;
    const company: any = await AssociateCompanyModel.findOne({
      _id: companyId,
      referredByCompanyId: { $ne: null },
      registrationStatus: "APPROVED",
      isApproved: true,
    }).select("_id referralActivatedAt").lean();
    if (!company) return false;

    const activityResult = await AssociateReferralActivityModel.updateOne(
      { companyId: company._id, type, sourceEntityId: entityId },
      { $setOnInsert: { companyId: company._id, type, sourceEntityId: entityId, occurredAt: new Date() } },
      { upsert: true }
    );

    if (company.referralActivatedAt) return activityResult.upsertedCount > 0;
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

  static async recordCompanyActivity(
    companyId: string | mongoose.Types.ObjectId | null | undefined,
    type: ReferralActivityType,
    entityId: string | mongoose.Types.ObjectId,
    occurredAt: Date = new Date()
  ) {
    if (!companyId || !mongoose.Types.ObjectId.isValid(String(companyId))) return false;
    if (!entityId || !mongoose.Types.ObjectId.isValid(String(entityId))) return false;
    const company: any = await AssociateCompanyModel.findOne({
      _id: companyId,
      referredByCompanyId: { $ne: null },
      registrationStatus: "APPROVED",
      isApproved: true,
    }).select("_id referralActivatedAt").lean();
    if (!company) return false;
    const activityResult = await AssociateReferralActivityModel.updateOne(
      { companyId: company._id, type, sourceEntityId: entityId },
      { $setOnInsert: { companyId: company._id, type, sourceEntityId: entityId, occurredAt } },
      { upsert: true }
    );
    if (!company.referralActivatedAt) {
      await AssociateCompanyModel.updateOne(
        { _id: company._id, referralActivatedAt: null },
        { $set: { referralActivatedAt: occurredAt, referralActivationEvent: { type, entityId } } }
      );
    }
    return activityResult.upsertedCount > 0;
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
