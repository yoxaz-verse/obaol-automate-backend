import { Request, Response, NextFunction } from "express";
import { AssociateModel } from "../database/models/associate";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";

export class CompanyController {
    /**
     * Get team performance stats for a specific company
     */
    static async getTeamStats(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            // 1. Get all associates belonging to this company
            const associates = await AssociateModel.find({ associateCompany: id, isDeleted: false });

            // 2. Fetch performance data for each associate
            const teamStats = await Promise.all(associates.map(async (associate) => {
                const assocId = associate._id.toString();

                // Get Enquiries involving this associate
                const enquiries = await InquiryModel.countDocuments({
                    $or: [
                        { buyerAssociateId: assocId },
                        { sellerAssociateId: assocId },
                        { mediatorAssociateId: assocId }
                    ]
                });

                // Get completed orders where this associate was involved in the enquiry
                const orders = await OrderModel.countDocuments({
                    "enquiry.productAssociate": assocId,
                    status: "Delivered" // Example status constraint
                });

                return {
                    _id: associate._id,
                    name: associate.name,
                    email: associate.email,
                    phone: associate.phone,
                    designation: associate.designation,
                    isEmailVerified: associate.isEmailVerified,
                    isPhoneVerified: associate.isPhoneVerified,
                    isOneToOneVerified: associate.isOneToOneVerified,
                    isCompanyVerified: associate.isCompanyVerified,
                    performance: {
                        enquiriesHandled: enquiries,
                        ordersCompleted: orders
                    }
                };
            }));

            res.status(200).json({
                success: true,
                data: teamStats
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Get recent enquiries for a specific company
     */
    static async getCompanyEnquiries(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const limit = Math.max(1, Math.min(Number(req.query.limit || 10), 50));

            const associates = await AssociateModel.find({ associateCompany: id, isDeleted: false })
                .select("_id")
                .lean();
            const associateIds = associates.map((a: any) => a._id);
            if (!associateIds.length) {
                return res.status(200).json({ success: true, data: [] });
            }

            const enquiries = await InquiryModel.find({
                isDeleted: { $ne: true },
                $or: [
                    { buyerAssociateId: { $in: associateIds } },
                    { sellerAssociateId: { $in: associateIds } },
                    { mediatorAssociateId: { $in: associateIds } },
                ],
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate([
                    { path: "productId", select: "name" },
                    { path: "buyerAssociateId", select: "name email phone associateCompany", populate: { path: "associateCompany", select: "name" } },
                    { path: "sellerAssociateId", select: "name email phone associateCompany", populate: { path: "associateCompany", select: "name" } },
                    { path: "mediatorAssociateId", select: "name email phone associateCompany", populate: { path: "associateCompany", select: "name" } },
                    { path: "supplierOperatorId", select: "name email phone" },
                    { path: "dealCloserOperatorId", select: "name email phone" },
                ])
                .lean();

            return res.status(200).json({ success: true, data: enquiries || [] });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get recent activity (orders + enquiries) for a specific company
     */
    static async getCompanyActivity(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const limit = Math.max(1, Math.min(Number(req.query.limit || 20), 50));

            const associates = await AssociateModel.find({ associateCompany: id, isDeleted: false })
                .select("_id")
                .lean();
            const associateIds = associates.map((a: any) => a._id);

            const [enquiries, orders] = await Promise.all([
                associateIds.length
                    ? InquiryModel.find({
                        isDeleted: { $ne: true },
                        $or: [
                            { buyerAssociateId: { $in: associateIds } },
                            { sellerAssociateId: { $in: associateIds } },
                            { mediatorAssociateId: { $in: associateIds } },
                        ],
                    })
                        .sort({ createdAt: -1 })
                        .limit(limit)
                        .populate([
                            { path: "productId", select: "name" },
                            { path: "buyerAssociateId", select: "name" },
                            { path: "sellerAssociateId", select: "name" },
                            { path: "mediatorAssociateId", select: "name" },
                        ])
                        .lean()
                    : [],
                OrderModel.find({ associateCompanyId: id, isDeleted: { $ne: true } })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .populate([
                        { path: "enquiry", populate: [{ path: "productId", select: "name" }] },
                    ])
                    .lean(),
            ]);

            const normalizedEnquiries = (enquiries || []).map((row: any) => ({
                type: "enquiry",
                id: row?._id,
                status: row?.status || "New",
                createdAt: row?.createdAt,
                title: row?.productId?.name || "Enquiry",
                parties: {
                    buyer: row?.buyerAssociateId?.name,
                    seller: row?.sellerAssociateId?.name,
                    mediator: row?.mediatorAssociateId?.name,
                },
            }));

            const normalizedOrders = (orders || []).map((row: any) => ({
                type: "order",
                id: row?._id,
                status: row?.status || "Processing",
                createdAt: row?.createdAt,
                title: row?.enquiry?.productId?.name || "Order",
                parties: {},
            }));

            const merged = [...normalizedEnquiries, ...normalizedOrders]
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .slice(0, limit);

            return res.status(200).json({ success: true, data: merged });
        } catch (error) {
            next(error);
        }
    }
}
