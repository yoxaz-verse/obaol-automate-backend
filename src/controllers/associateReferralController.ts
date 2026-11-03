import mongoose from "mongoose";
import { Request, Response } from "express";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateReferralEarningModel } from "../database/models/associateReferralEarning";
import { AssociateReferralInvitationModel } from "../database/models/associateReferralInvitation";
import { CommissionRuleModel } from "../database/models/commissionRule";
import { AssociateReferralService, indiaMonthWindow } from "../services/associateReferral.service";
import { AssociateReferralActivityModel } from "../database/models/associateReferralActivity";
import { WhatsappDeliveryModel } from "../database/models/whatsappDelivery";
import { sendWhatsappTemplate, usableWhatsappConnection } from "../services/whatsappService";
import { AssociateReferralShareModel, REFERRAL_SHARE_TYPES, ReferralShareType } from "../database/models/associateReferralShare";
import { AssociateReferralShareService } from "../services/associateReferralShare.service";

const round2 = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export class AssociateReferralController {
  private static async resolveCompanyId(req: Request) {
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "admin" && req.params.companyId) return String(req.params.companyId);
    if (role !== "associate") return null;
    const associate = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
    return String((associate as any)?.associateCompany || "") || null;
  }

  static async getDashboard(req: Request, res: Response) {
    try {
      const companyId = await AssociateReferralController.resolveCompanyId(req);
      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(403).json({ success: false, message: "Associate company access is required." });
      }
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
      const company: any = await AssociateCompanyModel.findById(companyId).select("name referralCode registrationStatus").lean();
      if (!company) return res.status(404).json({ success: false, message: "Associate company not found." });
      const referralCode = company.referralCode || await AssociateReferralService.ensureCompanyCode(companyId);

      const [referrals, referralCount, earningRows, earningCount, totalAgg, invitations, commissionRule] = await Promise.all([
        AssociateCompanyModel.find({ referredByCompanyId: company._id })
          .sort({ createdAt: -1 })
          .select("name registrationStatus isApproved referralCapturedAt referralActivatedAt referralActivationEvent createdAt")
          .lean(),
        AssociateCompanyModel.countDocuments({ referredByCompanyId: company._id }),
        AssociateReferralEarningModel.find({ referrerCompanyId: company._id })
          .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
          .select("orderId referredCompanyIds poolPercent amount status createdAt").lean(),
        AssociateReferralEarningModel.countDocuments({ referrerCompanyId: company._id }),
        AssociateReferralEarningModel.aggregate([
          { $match: { referrerCompanyId: company._id, status: { $ne: "VOID" } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        AssociateReferralInvitationModel.find({ referrerCompanyId: company._id })
          .sort({ createdAt: -1 }).limit(100)
          .populate("joinedCompanyId", "name registrationStatus referralActivatedAt")
          .select("recipientName channel destination joinedCompanyId joinedAt createdAt").lean(),
        CommissionRuleModel.findOne({ isDefault: true, isActive: { $ne: false } }).select("associateReferralPercent").lean(),
      ]);

      const eligibilityWindow = indiaMonthWindow();
      const referredCompanyIds = referrals.map((row: any) => row._id);
      const currentActivities: any[] = referredCompanyIds.length
        ? await AssociateReferralActivityModel.find({
            companyId: { $in: referredCompanyIds },
            occurredAt: { $gte: eligibilityWindow.start, $lt: eligibilityWindow.end },
          }).sort({ occurredAt: -1 }).lean()
        : [];
      const latestActivityByCompany = new Map<string, any>();
      currentActivities.forEach((activity: any) => {
        const id = String(activity.companyId);
        if (!latestActivityByCompany.has(id)) latestActivityByCompany.set(id, activity);
      });
      const activeCompanyIds = new Set(latestActivityByCompany.keys());
      const activeCount = activeCompanyIds.size;
      const whatsappRows: any[] = invitations.length ? await WhatsappDeliveryModel.find({ invitationId: { $in: invitations.map((row: any) => row._id) } }).sort({ createdAt: -1 }).lean() : [];
      const whatsappByInvitation = new Map<string, any>(); whatsappRows.forEach((row: any) => { const id = String(row.invitationId || ""); if (!whatsappByInvitation.has(id)) whatsappByInvitation.set(id, row); });

      const joinedCompanyIds = invitations.map((row: any) => row.joinedCompanyId?._id).filter(Boolean);
      const earnedCompanyIds = new Set<string>();
      if (joinedCompanyIds.length) {
        const earningMatches: any[] = await AssociateReferralEarningModel.find({
          referrerCompanyId: company._id, status: { $ne: "VOID" }, referredCompanyIds: { $in: joinedCompanyIds },
        }).select("referredCompanyIds").lean();
        earningMatches.forEach((row: any) => (row.referredCompanyIds || []).forEach((id: any) => earnedCompanyIds.add(String(id))));
      }
      const invitationRows = invitations.map((row: any) => {
        const joined = row.joinedCompanyId;
        const joinedId = String(joined?._id || "");
        const status = joinedId && earnedCompanyIds.has(joinedId)
          ? "EARNED"
          : activeCompanyIds.has(joinedId)
            ? "ACTIVE"
            : joinedId
              ? "JOINED"
              : "INVITED";
        return {
          id: row._id, recipientName: row.recipientName, channel: row.channel, destination: row.destination,
          status, joinedAt: row.joinedAt, createdAt: row.createdAt,
          whatsappDelivery: whatsappByInvitation.get(String(row._id)) || null,
          company: joinedId ? {
            id: joined._id, name: joined.name, registrationStatus: joined.registrationStatus,
            activeThisMonth: activeCompanyIds.has(joinedId),
            lastActivityAt: latestActivityByCompany.get(joinedId)?.occurredAt || null,
            lastActivityType: latestActivityByCompany.get(joinedId)?.type || null,
          } : null,
        };
      });
      const invitationSummary = invitationRows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, { INVITED: 0, JOINED: 0, ACTIVE: 0, EARNED: 0 });

      const shares: any[] = await AssociateReferralShareModel.find({ referrerCompanyId: company._id }).sort({ createdAt: -1 }).lean();
      const sharedCompanies: any[] = shares.length ? await AssociateCompanyModel.find({ referralShareId: { $in: shares.map((row) => row._id) } }).select("referralShareId referralActivatedAt _id").lean() : [];
      const shareCompanies = new Map<string, any[]>(); sharedCompanies.forEach((row: any) => { const key = String(row.referralShareId); shareCompanies.set(key, [...(shareCompanies.get(key) || []), row]); });
      const shareEarnings: any[] = sharedCompanies.length ? await AssociateReferralEarningModel.find({ referrerCompanyId: company._id, referredCompanyIds: { $in: sharedCompanies.map((row) => row._id) }, status: { $ne: "VOID" } }).select("referredCompanyIds").lean() : [];
      const earnedIds = new Set<string>(); shareEarnings.forEach((row: any) => (row.referredCompanyIds || []).forEach((id: any) => earnedIds.add(String(id))));
      const shareRows = await Promise.all(shares.map(async (row: any) => {
        const offering = await AssociateReferralShareService.resolveOffering(companyId, row.offeringType, row.offeringId), companies = shareCompanies.get(String(row._id)) || [];
        return { id: row._id, offeringType: row.offeringType, offeringId: row.offeringId, title: offering?.title || "Unavailable offering", status: offering ? row.status : "UNAVAILABLE", clicks: row.clickCount || 0, uniqueClicks: row.uniqueClickCount || 0, signups: companies.length, activated: companies.filter((item: any) => item.referralActivatedAt).length, earned: companies.filter((item: any) => earnedIds.has(String(item._id))).length, createdAt: row.createdAt };
      }));
      return res.json({ success: true, data: {
        company: { id: company._id, name: company.name, referralCode },
        rewardPercent: Number((commissionRule as any)?.associateReferralPercent ?? 10),
        eligibilityWindow: { start: eligibilityWindow.start, end: eligibilityWindow.end, timeZone: "Asia/Kolkata" },
        summary: {
          totalReferrals: referralCount,
          activeReferrals: activeCount,
          pendingActivation: Math.max(0, referralCount - activeCount),
          totalEarnings: round2(totalAgg?.[0]?.total || 0),
        },
        referrals: referrals.map((row: any) => ({
          ...(latestActivityByCompany.has(String(row._id)) ? {
            activeThisMonth: true,
            lastActivityAt: latestActivityByCompany.get(String(row._id)).occurredAt,
            lastActivityType: latestActivityByCompany.get(String(row._id)).type,
          } : { activeThisMonth: false, lastActivityAt: null, lastActivityType: null }),
          id: row._id, name: row.name, registrationStatus: row.registrationStatus,
          referralCapturedAt: row.referralCapturedAt, referralActivatedAt: row.referralActivatedAt,
          activationType: row.referralActivationEvent?.type || null, createdAt: row.createdAt,
        })),
        invitations: invitationRows,
        invitationSummary,
        shares: shareRows,
        earnings: earningRows.map((row: any) => ({
          orderId: row.orderId, referredCompanyCount: row.referredCompanyIds?.length || 0,
          percent: row.poolPercent, amount: round2(row.amount), status: row.status, createdAt: row.createdAt,
        })),
        pagination: { page, limit, total: earningCount, totalPages: Math.max(1, Math.ceil(earningCount / limit)) },
      } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to load referrals." });
    }
  }

  static async createInvitation(req: Request, res: Response) {
    try {
      const companyId = await AssociateReferralController.resolveCompanyId(req);
      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(403).json({ success: false, message: "Associate company access is required." });
      }
      const company: any = await AssociateCompanyModel.findById(companyId).select("name referralCode").lean();
      if (!company) return res.status(404).json({ success: false, message: "Associate company not found." });
      const referralCode = company.referralCode || await AssociateReferralService.ensureCompanyCode(companyId);
      const { invitation, token } = await AssociateReferralService.createInvitation({
        referrerCompanyId: companyId,
        recipientName: req.body?.recipientName,
        channel: req.body?.channel,
        destination: req.body?.destination,
        idempotencyKey: req.body?.idempotencyKey,
      });
      const registrationPath = `/auth/register?role=associate&ref=${encodeURIComponent(String(referralCode))}&invite=${encodeURIComponent(token)}`;
      const frontendUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
      let whatsappDelivery: any = null;
      if (String(invitation.channel) === "WHATSAPP") {
        const templateName = String(process.env.META_WHATSAPP_INVITATION_TEMPLATE || "obaol_participation_invitation_v1"), language = String(process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || "en_US");
        whatsappDelivery = await WhatsappDeliveryModel.findOne({ companyId, idempotencyKey: String(req.body?.idempotencyKey) });
        if (!whatsappDelivery) whatsappDelivery = await WhatsappDeliveryModel.create({ companyId, invitationId: invitation._id, recipient: invitation.destination, sender: "pending", templateName, templateLanguage: language, idempotencyKey: String(req.body?.idempotencyKey), status: "QUEUED", initiatedBy: req.user?.id || null });
        if (!["SENT", "DELIVERED", "READ"].includes(String(whatsappDelivery.status))) {
          try { const { connection, token: accessToken } = await usableWhatsappConnection(companyId); whatsappDelivery.sender = connection.displayPhoneNumber; whatsappDelivery.status = "SENDING"; whatsappDelivery.failureCode = ""; whatsappDelivery.failureMessage = ""; await whatsappDelivery.save(); const metaMessageId = await sendWhatsappTemplate({ phoneNumberId: connection.phoneNumberId, token: accessToken, to: invitation.destination, templateName, language, bodyParameters: [invitation.recipientName, company.name], buttonSuffix: registrationPath.replace(/^\//, "") }); whatsappDelivery.metaMessageId = metaMessageId; whatsappDelivery.status = "SENT"; whatsappDelivery.sentAt = new Date(); await whatsappDelivery.save(); connection.lastSuccessfulUseAt = new Date(); await connection.save(); }
          catch (sendError: any) { whatsappDelivery.status = "FAILED"; whatsappDelivery.failedAt = new Date(); whatsappDelivery.failureCode = String(sendError?.code || "SEND_FAILED"); whatsappDelivery.failureMessage = String(sendError?.message || "WhatsApp invitation could not be sent").slice(0, 300); await whatsappDelivery.save(); throw sendError; }
        }
      }
      return res.status(201).json({ success: true, data: {
        invitation: {
          id: invitation._id, recipientName: invitation.recipientName, channel: invitation.channel,
          destination: invitation.destination, status: invitation.joinedCompanyId ? "JOINED" : "INVITED", createdAt: invitation.createdAt,
        },
        registrationPath,
        invitationUrl: frontendUrl ? `${frontendUrl}${registrationPath}` : registrationPath,
        whatsappDelivery,
      } });
    } catch (error: any) {
      return res.status(Number(error?.status || 500)).json({ success: false, message: error?.message || "Failed to create invitation." });
    }
  }

  static async listShareableOfferings(req: Request, res: Response) {
    try {
      const companyId = await AssociateReferralController.resolveCompanyId(req);
      if (!companyId) return res.status(403).json({ success: false, message: "Associate company access is required." });
      return res.json({ success: true, data: await AssociateReferralShareService.listOfferings(companyId) });
    } catch (error: any) { return res.status(500).json({ success: false, message: error?.message || "Failed to load offerings." }); }
  }

  static async createShare(req: Request, res: Response) {
    try {
      const companyId = await AssociateReferralController.resolveCompanyId(req), type = String(req.body?.offeringType || "").toUpperCase() as ReferralShareType;
      if (!companyId) return res.status(403).json({ success: false, message: "Associate company access is required." });
      if (!(REFERRAL_SHARE_TYPES as readonly string[]).includes(type)) return res.status(400).json({ success: false, message: "Choose a valid offering type." });
      const result = await AssociateReferralShareService.create(companyId, type, String(req.body?.offeringId || ""));
      const path = `/share/${result.token}`, frontendUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
      return res.status(201).json({ success: true, data: { id: result.share._id, token: result.token, path, url: frontendUrl ? `${frontendUrl}${path}` : path, offering: { ...result.offering, price: undefined } } });
    } catch (error: any) { return res.status(Number(error?.status || 500)).json({ success: false, message: error?.message || "Failed to create share link." }); }
  }

  static async resolveShare(req: Request, res: Response) {
    try {
      const result = await AssociateReferralShareService.resolve(req.params.token);
      if (!result) return res.status(404).json({ success: false, message: "This shared offering is no longer available." });
      const fingerprint = `${String(req.ip || "")}|${String(req.get("user-agent") || "").slice(0, 300)}`;
      await AssociateReferralShareService.recordVisit(result.share._id, fingerprint, req.query.channel);
      const registrationPath = `/auth/register?role=associate&ref=${encodeURIComponent(result.company.referralCode)}&share=${encodeURIComponent(result.token)}`;
      return res.json({ success: true, data: { offering: result.offering, company: { name: result.company.name }, registrationPath, attributionDays: 30 } });
    } catch (error: any) { return res.status(500).json({ success: false, message: error?.message || "Failed to open shared offering." }); }
  }
}
