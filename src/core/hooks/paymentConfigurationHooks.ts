import { ExecutionMode } from "../types";
import { IncotermModel } from "../../database/models/incoterm";
import { PaymentTermModel } from "../../database/models/paymentTerm";
import { InquiryModel } from "../../database/models/enquiry";
import { OrderModel } from "../../database/models/order";

const configurationError = (message: string, statusCode = 400) => {
    const error: any = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const requireAdmin = (req: any) => {
    if (String(req?.user?.role || "").toLowerCase() !== "admin") {
        throw configurationError("Only administrators can change payment configuration.", 403);
    }
};

const codes = (value: any) => Array.isArray(value)
    ? [...new Set(value.map((item) => String(item).trim().toUpperCase()).filter(Boolean))]
    : [];

export const activeConfigurationReadHook = async (query: any, _mode: any, _id: any, req: any) => {
    const next = { ...(query || {}) };
    const activeOnly = next.activeOnly === true || next.activeOnly === "true";
    delete next.activeOnly;
    if (activeOnly || String(req?.user?.role || "").toLowerCase() !== "admin") {
        next.isActive = { $ne: false };
    }
    return next;
};

export const incotermConfigurationWriteHook = async (payload: any, mode: ExecutionMode, id?: string, req?: any) => {
    requireAdmin(req);
    if (mode === ExecutionMode.DELETE && id) {
        const [enquiry, order] = await Promise.all([
            InquiryModel.exists({ preferredIncoterm: id }),
            OrderModel.exists({ incotermId: id }),
        ]);
        if (enquiry || order) throw configurationError("This Incoterm is already in use. Turn it off instead of deleting it.", 409);
    }
    return payload;
};

export const paymentTermConfigurationWriteHook = async (payload: any, mode: ExecutionMode, id?: string, req?: any) => {
    requireAdmin(req);
    if (mode === ExecutionMode.DELETE && id) {
        const [enquiry, order] = await Promise.all([
            InquiryModel.exists({ paymentTermId: id }),
            OrderModel.exists({ paymentTermId: id }),
        ]);
        if (enquiry || order) throw configurationError("This payment term is already in use. Turn it off instead of deleting it.", 409);
        return payload;
    }

    const existing: any = id ? await PaymentTermModel.findById(id).lean() : null;
    const merged = { ...(existing || {}), ...(payload || {}) };
    const applicableIncoterms = codes(merged.applicableIncoterms);
    const defaultForIncoterms = codes(merged.defaultForIncoterms);
    const milestones = Array.isArray(merged.milestones) ? merged.milestones : [];

    if (applicableIncoterms.length === 0) throw configurationError("Select at least one compatible Incoterm.");
    if (milestones.length === 0) throw configurationError("Add at least one payment section.");
    const total = milestones.reduce((sum: number, item: any) => sum + Number(item?.percent || 0), 0);
    if (milestones.some((item: any) => !String(item?.label || "").trim() || Number(item?.percent) <= 0 || !["DOC", "STAGE"].includes(String(item?.triggerType || "").toUpperCase()) || !String(item?.triggerValue || "").trim())) {
        throw configurationError("Every payment section needs a label, positive percentage, trigger type, and trigger value.");
    }
    if (Math.round(total * 100) / 100 !== 100) throw configurationError("Payment section percentages must total 100%.");
    if (defaultForIncoterms.some((code) => !applicableIncoterms.includes(code))) {
        throw configurationError("A default Incoterm must also be selected as a compatible Incoterm.");
    }

    const referencedCodes = [...new Set([...applicableIncoterms, ...defaultForIncoterms])];
    const activeIncoterms = referencedCodes.length
        ? await IncotermModel.find({ code: { $in: referencedCodes }, isActive: { $ne: false } }).select("code").lean()
        : [];
    const activeCodes = new Set(activeIncoterms.map((item: any) => String(item.code).toUpperCase()));
    const missing = referencedCodes.filter((code) => !activeCodes.has(code));
    if (missing.length) throw configurationError(`Inactive or unknown Incoterm: ${missing.join(", ")}.`);

    if (merged.isActive !== false && defaultForIncoterms.length) {
        const conflict: any = await PaymentTermModel.findOne({
            ...(id ? { _id: { $ne: id } } : {}),
            isActive: { $ne: false },
            defaultForIncoterms: { $in: defaultForIncoterms },
        }).select("label defaultForIncoterms").lean();
        if (conflict) throw configurationError(`A default payment term already exists for one or more selected Incoterms (${conflict.label}).`, 409);
    }

    return {
        ...payload,
        applicableIncoterms,
        defaultForIncoterms,
        milestones: milestones.map((item: any) => ({
            label: String(item.label).trim(),
            percent: Number(item.percent),
            triggerType: String(item.triggerType).toUpperCase(),
            triggerValue: String(item.triggerValue).trim().toUpperCase(),
        })),
    };
};
