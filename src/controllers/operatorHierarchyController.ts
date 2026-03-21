import mongoose from "mongoose";
import { Request, Response } from "express";
import { OperatorModel, generateOperatorReferralCode } from "../database/models/operator";
import { CommissionModel } from "../database/models/commission";
import { OperatorHierarchyService } from "../services/operatorHierarchy.service";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { VariantRateModel } from "../database/models/variantRate";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";

const forbidden = (res: Response) =>
    res.status(403).json({ success: false, message: "You are not allowed to access this operator resource." });

const isAdmin = (role: string) => role === "admin";
const isOperatorActor = (role: string) => role === "operator" || role === "team";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();

const canAccessOperatorResource = async (req: Request, targetOperatorId: string): Promise<boolean> => {
    const actorId = String((req as any)?.user?.id || "");
    const roleLower = normalizeRole((req as any)?.user?.role);

    if (!actorId) return false;
    if (isAdmin(roleLower)) return true;
    if (!isOperatorActor(roleLower)) return false;
    if (actorId === targetOperatorId) return true;

    return OperatorHierarchyService.isInDownline(actorId, targetOperatorId);
};

export class OperatorHierarchyController {
    static async getOverview(req: Request, res: Response) {
        try {
            const roleLower = normalizeRole((req as any)?.user?.role);
            if (!isAdmin(roleLower)) {
                return forbidden(res);
            }

            const operatorId = String(req.params.operatorId || "").trim();
            if (!mongoose.Types.ObjectId.isValid(operatorId)) {
                return res.status(400).json({ success: false, message: "Invalid operatorId." });
            }

            const operator = await OperatorModel.findOne({ _id: operatorId, isDeleted: { $ne: true } })
                .select("_id name email")
                .lean();
            if (!operator) {
                return res.status(404).json({ success: false, message: "Operator not found." });
            }

            const companies = await AssociateCompanyModel.find({
                assignedOperator: new mongoose.Types.ObjectId(operatorId),
                isDeleted: { $ne: true },
            })
                .select("_id name slug assignedOperator")
                .lean();

            const companyIds = companies.map((row: any) => row._id).filter(Boolean);
            const statsMap = new Map<string, { totalProducts: number; liveProducts: number }>();
            if (companyIds.length) {
                const stats = await VariantRateModel.aggregate([
                    { $match: { associateCompany: { $in: companyIds } } },
                    {
                        $group: {
                            _id: "$associateCompany",
                            totalProducts: { $sum: 1 },
                            liveProducts: { $sum: { $cond: ["$isLive", 1, 0] } },
                        },
                    },
                ]);
                stats.forEach((row: any) => {
                    statsMap.set(String(row._id), {
                        totalProducts: Number(row.totalProducts || 0),
                        liveProducts: Number(row.liveProducts || 0),
                    });
                });
            }

            const enquiryIds = await InquiryModel.find({
                assignedOperatorId: new mongoose.Types.ObjectId(operatorId),
                isDeleted: { $ne: true },
            }).distinct("_id");

            const totalEnquiries = enquiryIds.length;
            const totalOrders = enquiryIds.length
                ? await OrderModel.countDocuments({ enquiry: { $in: enquiryIds } })
                : 0;

            const companiesWithStats = companies.map((row: any) => {
                const stat = statsMap.get(String(row._id)) || { totalProducts: 0, liveProducts: 0 };
                return {
                    ...row,
                    productCount: stat.totalProducts,
                    liveProductCount: stat.liveProducts,
                };
            });

            const totalProducts = companiesWithStats.reduce((sum, row: any) => sum + Number(row.productCount || 0), 0);
            const totalLiveProducts = companiesWithStats.reduce((sum, row: any) => sum + Number(row.liveProductCount || 0), 0);

            return res.json({
                success: true,
                data: {
                    operator: {
                        id: String((operator as any)._id),
                        name: (operator as any).name,
                        email: (operator as any).email,
                    },
                    companySummary: {
                        totalAssignedCompanies: companies.length,
                        totalProducts,
                        totalLiveProducts,
                        totalEnquiries,
                        totalOrders,
                    },
                    companies: companiesWithStats,
                },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error?.message || "Failed to fetch operator overview." });
        }
    }
    static async getLeadershipChain(req: Request, res: Response) {
        try {
            const operatorId = String(req.params.operatorId || "").trim();
            if (!mongoose.Types.ObjectId.isValid(operatorId)) {
                return res.status(400).json({ success: false, message: "Invalid operatorId." });
            }

            const hasAccess = await canAccessOperatorResource(req, operatorId);
            if (!hasAccess) return forbidden(res);

            const operator = await OperatorModel.findOne({ _id: operatorId, isDeleted: { $ne: true } })
                .select("_id name email mentorOperator")
                .populate("mentorOperator", "name email")
                .lean();
            if (!operator) {
                return res.status(404).json({ success: false, message: "Operator not found." });
            }

            const leadershipChain = await OperatorHierarchyService.getLeadershipChain(operatorId);
            const mentor: any = (operator as any).mentorOperator;

            return res.json({
                success: true,
                data: {
                    operator: {
                        operatorId: String((operator as any)._id),
                        name: (operator as any).name,
                        email: (operator as any).email,
                    },
                    mentor: mentor
                        ? {
                            operatorId: String(mentor._id),
                            name: mentor.name,
                            email: mentor.email,
                        }
                        : null,
                    leadershipChain: leadershipChain.map((row: any) => ({
                        operatorId: String(row._id),
                        name: row.name,
                        level: Number(row.level || 0),
                    })),
                    depthCount: leadershipChain.length,
                },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error?.message || "Failed to fetch leadership chain." });
        }
    }

    static async getTeam(req: Request, res: Response) {
        try {
            const operatorId = String(req.params.operatorId || "").trim();
            if (!mongoose.Types.ObjectId.isValid(operatorId)) {
                return res.status(400).json({ success: false, message: "Invalid operatorId." });
            }

            const hasAccess = await canAccessOperatorResource(req, operatorId);
            if (!hasAccess) return forbidden(res);

            const manager = await OperatorModel.findOne({ _id: operatorId, isDeleted: { $ne: true } })
                .select("_id name email mentorOperator referralCode")
                .populate("mentorOperator", "name email")
                .lean();
            if (!manager) {
                return res.status(404).json({ success: false, message: "Operator not found." });
            }

            let referralCode = String((manager as any).referralCode || "").trim();
            if (!referralCode) {
                const newCode = await generateOperatorReferralCode();
                await OperatorModel.updateOne({ _id: operatorId }, { $set: { referralCode: newCode } });
                referralCode = newCode;
            }

            const managerObjectId = new mongoose.Types.ObjectId(operatorId);
            const directReports = await OperatorModel.find({
                mentorOperator: managerObjectId,
                isDeleted: { $ne: true },
            })
                .select("_id name email mentorOperator")
                .populate("mentorOperator", "name email")
                .lean();

            const directReportIds = directReports.map((row: any) => row._id).filter(Boolean);

            let teamSizeByOperator = new Map<string, number>();
            if (directReportIds.length) {
                const graphRows = await OperatorModel.aggregate([
                    { $match: { _id: { $in: directReportIds } } },
                    {
                        $graphLookup: {
                            from: "operators",
                            startWith: "$_id",
                            connectFromField: "_id",
                            connectToField: "mentorOperator",
                            as: "downline",
                            restrictSearchWithMatch: { isDeleted: { $ne: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            teamSize: { $size: "$downline" },
                        },
                    },
                ]);

                teamSizeByOperator = new Map<string, number>(
                    graphRows.map((row: any) => [String(row._id), Number(row.teamSize || 0)])
                );
            }

            let commissionByOperator = new Map<string, number>();
            if (directReportIds.length) {
                const commissionRows = await CommissionModel.aggregate([
                    { $match: { operatorId: { $in: directReportIds } } },
                    {
                        $group: {
                            _id: "$operatorId",
                            totalCommission: { $sum: "$amount" },
                        },
                    },
                ]);
                commissionByOperator = new Map<string, number>(
                    commissionRows.map((row: any) => [String(row._id), Number(row.totalCommission || 0)])
                );
            }

            return res.json({
                success: true,
                data: {
                    manager: {
                        operatorId: String((manager as any)._id),
                        name: (manager as any).name,
                        referralCode,
                    },
                    directTeam: directReports.map((row: any) => {
                        const mentor = row.mentorOperator as any;
                        return {
                            operatorId: String(row._id),
                            name: row.name,
                            mentorOperator: mentor
                                ? {
                                    operatorId: String(mentor._id),
                                    name: mentor.name,
                                }
                                : null,
                            teamSize: Number(teamSizeByOperator.get(String(row._id)) || 0),
                            totalCommission: Math.round((Number(commissionByOperator.get(String(row._id)) || 0) + Number.EPSILON) * 100) / 100,
                        };
                    }),
                },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error?.message || "Failed to fetch team hierarchy." });
        }
    }

    static async regenerateReferral(req: Request, res: Response) {
        try {
            const operatorId = String(req.params.operatorId || "").trim();
            if (!mongoose.Types.ObjectId.isValid(operatorId)) {
                return res.status(400).json({ success: false, message: "Invalid operatorId." });
            }

            const actorId = String((req as any)?.user?.id || "");
            const roleLower = normalizeRole((req as any)?.user?.role);
            if (!isAdmin(roleLower) && actorId !== operatorId) {
                return forbidden(res);
            }

            const operator = await OperatorModel.findOne({ _id: operatorId, isDeleted: { $ne: true } });
            if (!operator) {
                return res.status(404).json({ success: false, message: "Operator not found." });
            }

            const newCode = await generateOperatorReferralCode();
            operator.referralCode = newCode;
            await operator.save();

            return res.json({
                success: true,
                data: { referralCode: newCode },
                message: "Referral code regenerated.",
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error?.message || "Failed to regenerate referral code." });
        }
    }
}
