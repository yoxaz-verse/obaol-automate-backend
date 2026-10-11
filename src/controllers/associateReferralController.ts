import mongoose from "mongoose";
import { Request, Response } from "express";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateReferralEarningModel } from "../database/models/associateReferralEarning";
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

      const [referrals, referralCount, activeCount, earningRows, earningCount, totalAgg] = await Promise.all([
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
      ]);

      return res.json({ success: true, data: {
        company: { id: company._id, name: company.name, referralCode },
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
}
