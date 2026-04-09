import mongoose from "mongoose";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { AssociateModel } from "../../database/models/associate";
import { CommissionRuleModel } from "../../database/models/commissionRule";
import { InquiryModel } from "../../database/models/enquiry";
import { OrderModel } from "../../database/models/order";
import { ExecutionMode, HookFunction } from "../types";

const isCompletedStatus = (status: unknown) => String(status || "").trim().toUpperCase() === "COMPLETED";

const badRequest = (message: string) => {
    const err: any = new Error(message);
    err.status = 400;
    err.statusCode = 400;
    return err;
};

const resolveHandlerPercent = async () => {
    const defaultRule = await CommissionRuleModel.findOne({ isDefault: true, isActive: { $ne: false } }).lean();
    const activeRule =
        defaultRule ||
        (await CommissionRuleModel.findOne({ isActive: { $ne: false } }).sort({ updatedAt: -1, createdAt: -1 }).lean());
    const handlerPercent = Number((activeRule as any)?.handlerPercent ?? 10);
    return Number.isFinite(handlerPercent) ? handlerPercent : 0;
};

export const orderCommissionPreWriteHook: HookFunction = async (payload, mode, id) => {
    if (mode !== ExecutionMode.CREATE && mode !== ExecutionMode.UPDATE) {
        return payload;
    }

    let existingOrder: any = null;
    if (mode === ExecutionMode.UPDATE && id) {
        existingOrder = await OrderModel.findById(id)
            .select("_id status enquiry associateCompanyId closedByOperator handlerOperatorId handlerBuyerRating handlerSellerRating")
            .lean();
        if (!existingOrder) {
            return payload;
        }
    }

    const currentStatus = mode === ExecutionMode.UPDATE ? existingOrder?.status : undefined;
    const nextStatus = Object.prototype.hasOwnProperty.call(payload || {}, "status")
        ? (payload as any)?.status
        : currentStatus;

    const shouldValidate = mode === ExecutionMode.CREATE
        ? isCompletedStatus(nextStatus)
        : (!isCompletedStatus(currentStatus) && isCompletedStatus(nextStatus));

    if (!shouldValidate) {
        return payload;
    }

    const nextPayload: any = { ...(payload || {}) };

    const orderEnquiryId = String(nextPayload?.enquiry || existingOrder?.enquiry || "").trim();
    let derivedCompanyId = String(nextPayload?.associateCompanyId || existingOrder?.associateCompanyId || "").trim();
    let derivedCloserId = String(nextPayload?.closedByOperator || existingOrder?.closedByOperator || "").trim();
    const handlerOperatorId = String(nextPayload?.handlerOperatorId || existingOrder?.handlerOperatorId || "").trim();
    const handlerBuyerRatingRaw = Object.prototype.hasOwnProperty.call(nextPayload || {}, "handlerBuyerRating")
        ? nextPayload?.handlerBuyerRating
        : existingOrder?.handlerBuyerRating;
    const handlerSellerRatingRaw = Object.prototype.hasOwnProperty.call(nextPayload || {}, "handlerSellerRating")
        ? nextPayload?.handlerSellerRating
        : existingOrder?.handlerSellerRating;

    if ((!derivedCompanyId || !mongoose.Types.ObjectId.isValid(derivedCompanyId)) && orderEnquiryId) {
        const inquiry = await InquiryModel.findById(orderEnquiryId)
            .select("sellerAssociateId dealCloserOperatorId")
            .lean();

        if (inquiry) {
            const sellerAssociateId = String((inquiry as any).sellerAssociateId || "").trim();
            if (sellerAssociateId && mongoose.Types.ObjectId.isValid(sellerAssociateId)) {
                const sellerAssociate = await AssociateModel.findById(sellerAssociateId)
                    .select("associateCompany")
                    .lean();
                const sellerCompanyId = String((sellerAssociate as any)?.associateCompany || "").trim();
                if (sellerCompanyId && mongoose.Types.ObjectId.isValid(sellerCompanyId)) {
                    derivedCompanyId = sellerCompanyId;
                }
            }

            const inquiryDealCloserId = String((inquiry as any).dealCloserOperatorId || "").trim();
            if (!derivedCloserId && inquiryDealCloserId && mongoose.Types.ObjectId.isValid(inquiryDealCloserId)) {
                derivedCloserId = inquiryDealCloserId;
            }
        }
    }

    if (derivedCompanyId && !derivedCloserId) {
        const supplierCompany = await AssociateCompanyModel.findById(derivedCompanyId)
            .select("assignedOperator")
            .lean();
        const assignedOperatorId = String((supplierCompany as any)?.assignedOperator || "").trim();
        if (assignedOperatorId && mongoose.Types.ObjectId.isValid(assignedOperatorId)) {
            derivedCloserId = assignedOperatorId;
        }
    }

    const profitValue = Object.prototype.hasOwnProperty.call(nextPayload, "profit")
        ? nextPayload.profit
        : existingOrder?.profit;
    const numericProfit = Number(profitValue);
    if (!Number.isFinite(numericProfit)) {
        throw badRequest("Completed order requires numeric profit for commission processing.");
    }

    if (!derivedCompanyId || !mongoose.Types.ObjectId.isValid(derivedCompanyId)) {
        throw badRequest("Completed order requires associateCompanyId (supplier company) for commission processing.");
    }

    if (!derivedCloserId || !mongoose.Types.ObjectId.isValid(derivedCloserId)) {
        throw badRequest("Completed order requires closedByOperator for commission processing.");
    }

    if (handlerOperatorId && mongoose.Types.ObjectId.isValid(handlerOperatorId)) {
        const handlerPercent = await resolveHandlerPercent();
        if (handlerPercent > 0) {
            const buyerRating = Number(handlerBuyerRatingRaw);
            const sellerRating = Number(handlerSellerRatingRaw);
            const isBuyerValid = Number.isFinite(buyerRating) && buyerRating >= 1 && buyerRating <= 5;
            const isSellerValid = Number.isFinite(sellerRating) && sellerRating >= 1 && sellerRating <= 5;
            if (!isBuyerValid || !isSellerValid) {
                throw badRequest("Completed order requires buyer and seller handler ratings (1-5).");
            }
        }
    }

    nextPayload.profit = numericProfit;
    nextPayload.associateCompanyId = derivedCompanyId;
    nextPayload.closedByOperator = derivedCloserId;

    return nextPayload;
};
