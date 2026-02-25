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
}
