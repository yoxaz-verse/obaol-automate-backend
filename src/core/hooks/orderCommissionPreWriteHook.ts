import mongoose from "mongoose";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { AssociateModel } from "../../database/models/associate";
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

export const orderCommissionPreWriteHook: HookFunction = async (payload, mode, id) => {
    if (mode !== ExecutionMode.CREATE && mode !== ExecutionMode.UPDATE) {
        return payload;
    }

    let existingOrder: any = null;
    if (mode === ExecutionMode.UPDATE && id) {
        existingOrder = await OrderModel.findById(id)
            .select("_id status enquiry associateCompanyId closedByEmployee")
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
    let derivedCloserId = String(nextPayload?.closedByEmployee || existingOrder?.closedByEmployee || "").trim();

    if ((!derivedCompanyId || !mongoose.Types.ObjectId.isValid(derivedCompanyId)) && orderEnquiryId) {
        const inquiry = await InquiryModel.findById(orderEnquiryId)
            .select("sellerAssociateId assignedEmployeeId")
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

            const inquiryAssignedEmployee = String((inquiry as any).assignedEmployeeId || "").trim();
            if (!derivedCloserId && inquiryAssignedEmployee && mongoose.Types.ObjectId.isValid(inquiryAssignedEmployee)) {
                derivedCloserId = inquiryAssignedEmployee;
            }
        }
    }

    if (derivedCompanyId && !derivedCloserId) {
        const supplierCompany = await AssociateCompanyModel.findById(derivedCompanyId)
            .select("assignedEmployee")
            .lean();
        const assignedEmployeeId = String((supplierCompany as any)?.assignedEmployee || "").trim();
        if (assignedEmployeeId && mongoose.Types.ObjectId.isValid(assignedEmployeeId)) {
            derivedCloserId = assignedEmployeeId;
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
        throw badRequest("Completed order requires closedByEmployee for commission processing.");
    }

    nextPayload.profit = numericProfit;
    nextPayload.associateCompanyId = derivedCompanyId;
    nextPayload.closedByEmployee = derivedCloserId;

    return nextPayload;
};
