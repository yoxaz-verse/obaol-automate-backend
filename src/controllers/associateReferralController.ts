import mongoose from "mongoose";
import { Request, Response } from "express";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateReferralEarningModel } from "../database/models/associateReferralEarning";
import { AssociateReferralInvitationModel } from "../database/models/associateReferralInvitation";
import { CommissionRuleModel } from "../database/models/commissionRule";
import { AssociateReferralService } from "../services/associateReferral.service";

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

      const [referrals, referralCount, activeCount, earningRows, earningCount, totalAgg, invitations, commissionRule] = await Promise.all([
        AssociateCompanyModel.find({ referredByCompanyId: company._id })
          .sort({ createdAt: -1 })
          .select("name registrationStatus isApproved referralCapturedAt referralActivatedAt referralActivationEvent createdAt")
          .lean(),
        AssociateCompanyModel.countDocuments({ referredByCompanyId: company._id }),
        AssociateCompanyModel.countDocuments({ referredByCompanyId: company._id, referralActivatedAt: { $ne: null } }),
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
          : joined?.referralActivatedAt
            ? "ACTIVE"
            : joinedId
              ? "JOINED"
              : "INVITED";
        return {
          id: row._id, recipientName: row.recipientName, channel: row.channel, destination: row.destination,
          status, joinedAt: row.joinedAt, createdAt: row.createdAt,
          company: joinedId ? { id: joined._id, name: joined.name, registrationStatus: joined.registrationStatus } : null,
        };
      });
      const invitationSummary = invitationRows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, { INVITED: 0, JOINED: 0, ACTIVE: 0, EARNED: 0 });

      return res.json({ success: true, data: {
        company: { id: company._id, name: company.name, referralCode },
        rewardPercent: Number((commissionRule as any)?.associateReferralPercent ?? 10),
        summary: {
          totalReferrals: referralCount,
          activeReferrals: activeCount,
          pendingActivation: Math.max(0, referralCount - activeCount),
          totalEarnings: round2(totalAgg?.[0]?.total || 0),
        },
        referrals: referrals.map((row: any) => ({
          id: row._id, name: row.name, registrationStatus: row.registrationStatus,
          referralCapturedAt: row.referralCapturedAt, referralActivatedAt: row.referralActivatedAt,
          activationType: row.referralActivationEvent?.type || null, createdAt: row.createdAt,
        })),
        invitations: invitationRows,
        invitationSummary,
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
      return res.status(201).json({ success: true, data: {
        invitation: {
          id: invitation._id, recipientName: invitation.recipientName, channel: invitation.channel,
          destination: invitation.destination, status: invitation.joinedCompanyId ? "JOINED" : "INVITED", createdAt: invitation.createdAt,
        },
        registrationPath,
        invitationUrl: frontendUrl ? `${frontendUrl}${registrationPath}` : registrationPath,
      } });
    } catch (error: any) {
      return res.status(Number(error?.status || 500)).json({ success: false, message: error?.message || "Failed to create invitation." });
    }
  }
}
