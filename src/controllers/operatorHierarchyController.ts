import mongoose from "mongoose";
import { Request, Response } from "express";
import { OperatorModel, generateOperatorReferralCode } from "../database/models/operator";
import { CommissionModel } from "../database/models/commission";
import { OperatorHierarchyService } from "../services/operatorHierarchy.service";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { VariantRateModel } from "../database/models/variantRate";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";
import { ProductModel } from "../database/models/product";

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
                .select("_id name email phone joiningDate createdAt lastSeenAt isActive registrationStatus approvedAt")
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

            const handledEnquiryFilter = {
                isDeleted: { $ne: true },
                $or: [
                    { assignedOperatorId: new mongoose.Types.ObjectId(operatorId) },
                    { supplierOperatorId: new mongoose.Types.ObjectId(operatorId) },
                    { dealCloserOperatorId: new mongoose.Types.ObjectId(operatorId) },
                    { handlerOperatorId: new mongoose.Types.ObjectId(operatorId) },
                ],
            };

            const enquiryIds = await InquiryModel.find(handledEnquiryFilter).distinct("_id");

            const totalEnquiries = enquiryIds.length;
            const totalOrders = enquiryIds.length
                ? await OrderModel.countDocuments({ enquiry: { $in: enquiryIds } })
                : 0;
            const [ownershipCoverage] = await InquiryModel.aggregate([
                {
                    $match: handledEnquiryFilter,
                },
                {
                    $group: {
                        _id: null,
                        enquiriesWithDC: {
                            $sum: {
                                $cond: [{ $ifNull: ["$dealCloserOperatorId", false] }, 1, 0],
                            },
                        },
                        enquiriesWithHandler: {
                            $sum: {
                                $cond: [{ $ifNull: ["$handlerOperatorId", false] }, 1, 0],
                            },
                        },
                        enquiriesWithSupplierPortfolioOwner: {
                            $sum: {
                                $cond: [{ $ifNull: ["$supplierOperatorId", false] }, 1, 0],
                            },
                        },
                        openEnquiries: {
                            $sum: {
                                $cond: [{ $in: ["$status", ["NEW", "CONTACTED", "IN_DISCUSSION", "QUOTE_REQUIRED"]] }, 1, 0],
                            },
                        },
                        closedEnquiries: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0],
                            },
                        },
                        cancelledEnquiries: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0],
                            },
                        },
                    },
                },
            ]);
            const ENQUIRY_OVERVIEW_LIMIT = 50;
            const enquiryRows = await InquiryModel.find(handledEnquiryFilter)
                .sort({ createdAt: -1 })
                .limit(ENQUIRY_OVERVIEW_LIMIT)
                .select("_id status createdAt sellerAssociateId buyerAssociateId supplierOperatorId dealCloserOperatorId handlerOperatorId")
                .populate("sellerAssociateId", "associateCompany")
                .populate("buyerAssociateId", "associateCompany")
                .populate("supplierOperatorId", "name email")
                .populate("dealCloserOperatorId", "name email")
                .populate("handlerOperatorId", "name email")
                .lean();

            const companyIdSet = new Set<string>();
            enquiryRows.forEach((row: any) => {
                const sellerCompanyId = String((row?.sellerAssociateId as any)?.associateCompany || "").trim();
                const buyerCompanyId = String((row?.buyerAssociateId as any)?.associateCompany || "").trim();
                if (sellerCompanyId) companyIdSet.add(sellerCompanyId);
                if (buyerCompanyId) companyIdSet.add(buyerCompanyId);
            });

            const enquiryCompanyMap = new Map<string, { id: string; name: string }>();
            if (companyIdSet.size > 0) {
                const enquiryCompanies = await AssociateCompanyModel.find({
                    _id: { $in: Array.from(companyIdSet).map((id) => new mongoose.Types.ObjectId(id)) },
                    isDeleted: { $ne: true },
                })
                    .select("_id name")
                    .lean();
                enquiryCompanies.forEach((company: any) => {
                    enquiryCompanyMap.set(String(company._id), {
                        id: String(company._id),
                        name: String(company.name || "Unknown Company"),
                    });
                });
            }

            const toOperatorBasic = (value: any) => {
                if (!value || typeof value !== "object") return null;
                const id = String(value?._id || "").trim();
                if (!id) return null;
                return {
                    id,
                    name: String(value?.name || "Unassigned"),
                    email: String(value?.email || ""),
                };
            };

            const enquiriesWithDC = Number(ownershipCoverage?.enquiriesWithDC || 0);
            const enquiriesWithHandler = Number(ownershipCoverage?.enquiriesWithHandler || 0);
            const enquiriesWithSupplierPortfolioOwner = Number(ownershipCoverage?.enquiriesWithSupplierPortfolioOwner || 0);
            const openEnquiries = Number(ownershipCoverage?.openEnquiries || 0);
            const closedEnquiries = Number(ownershipCoverage?.closedEnquiries || 0);
            const cancelledEnquiries = Number(ownershipCoverage?.cancelledEnquiries || 0);

            const enquiryList = enquiryRows.map((row: any) => {
                const sellerCompanyId = String((row?.sellerAssociateId as any)?.associateCompany || "").trim();
                const buyerCompanyId = String((row?.buyerAssociateId as any)?.associateCompany || "").trim();
                const company = enquiryCompanyMap.get(sellerCompanyId) || enquiryCompanyMap.get(buyerCompanyId) || null;
                return {
                    id: String(row._id),
                    status: String(row?.status || ""),
                    createdAt: row?.createdAt || null,
                    company,
                    supplierPortfolioOwner: toOperatorBasic(row?.supplierOperatorId),
                    enquiryDC: toOperatorBasic(row?.dealCloserOperatorId),
                    handler: toOperatorBasic(row?.handlerOperatorId),
                };
            });

            const topHandledProductRows = await InquiryModel.aggregate([
                { $match: handledEnquiryFilter },
                {
                    $group: {
                        _id: "$productId",
                        enquiryCount: { $sum: 1 },
                        lastHandledAt: { $max: "$createdAt" },
                    },
                },
                { $sort: { enquiryCount: -1, lastHandledAt: -1 } },
                { $limit: 25 },
            ]);
            const productIds = topHandledProductRows
                .map((row: any) => row?._id)
                .filter(Boolean)
                .map((id: any) => new mongoose.Types.ObjectId(String(id)));
            const productDocs = productIds.length
                ? await ProductModel.find({ _id: { $in: productIds }, isDeleted: { $ne: true } })
                    .select("_id name")
                    .lean()
                : [];
            const productMap = new Map<string, { id: string; name: string }>();
            productDocs.forEach((row: any) => {
                productMap.set(String(row._id), { id: String(row._id), name: String(row.name || "Unnamed Product") });
            });
            const handledProducts = topHandledProductRows.map((row: any) => {
                const productId = String(row?._id || "");
                const product = productMap.get(productId);
                return {
                    productId,
                    productName: product?.name || "Unknown Product",
                    enquiryCount: Number(row?.enquiryCount || 0),
                    lastHandledAt: row?.lastHandledAt || null,
                };
            });

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
                        phone: (operator as any).phone || "",
                        joiningDate: (operator as any).joiningDate || null,
                        createdAt: (operator as any).createdAt || null,
                        lastSeenAt: (operator as any).lastSeenAt || null,
                        isActive: Boolean((operator as any).isActive),
                        registrationStatus: (operator as any).registrationStatus || "PENDING_REVIEW",
                        approvedAt: (operator as any).approvedAt || null,
                    },
                    companySummary: {
                        totalAssignedCompanies: companies.length,
                        totalProducts,
                        totalLiveProducts,
                        totalEnquiries,
                        totalOrders,
                    },
                    enquirySummary: {
                        totalAssignedEnquiries: totalEnquiries,
                        enquiriesWithDC,
                        enquiriesWithHandler,
                        enquiriesWithSupplierPortfolioOwner,
                        openEnquiries,
                        closedEnquiries,
                        cancelledEnquiries,
                    },
                    companies: companiesWithStats,
                    enquiries: enquiryList,
                    handledProducts,
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
