import { InquiryModel } from "../../database/models/enquiry";

export const orderFilterHook = async (
    query: any,
    _mode: string,
    _id: string | undefined,
    req: any
): Promise<any> => {
    const user = req?.user;
    if (!user) return query;

    const role = String(user.role || "").toLowerCase();
    const userId = user.id;

    // Admin can see all orders
    if (role === "admin") return query;

    // Operator: orders tied to inquiries assigned to this operator, plus external orders they created
    if (role === "operator" || role === "team") {
        const inquiryIds = await InquiryModel.find({
            $or: [
                { assignedOperatorId: userId },
                { supplierOperatorId: userId },
                { dealCloserOperatorId: userId },
            ],
        }).distinct("_id");
        return {
            ...query,
            $or: [
                { enquiry: { $in: inquiryIds } },
                { isExternal: true, externalCreatedBy: userId },
            ],
        };
    }

    // Associate: orders tied to inquiries where associate is buyer/seller/mediator, plus external orders they created
    if (role === "associate") {
        const inquiryIds = await InquiryModel.find({
            $or: [
                { buyerAssociateId: userId },
                { sellerAssociateId: userId },
                { mediatorAssociateId: userId },
            ],
        }).distinct("_id");
        return {
            ...query,
            $or: [
                { enquiry: { $in: inquiryIds } },
                { isExternal: true, externalCreatedBy: userId },
            ],
        };
    }

    // Other roles: fallback to no restriction (existing behavior)
    return query;
};
