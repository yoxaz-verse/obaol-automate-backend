import { Types } from "mongoose";
import { PaymentTermModel } from "../database/models/paymentTerm";
import { OrderModel } from "../database/models/order";

export type PaymentMilestoneStatus = "PENDING" | "DUE" | "PAID";

export interface PaymentMilestone {
    label: string;
    percent: number;
    dueAtDocType: string | null;
    dueAtStageKey?: string | null;
    status: PaymentMilestoneStatus;
}

export const normalizeDocType = (value: string | null | undefined) =>
    String(value || "").toUpperCase().trim();

export const resolveMilestoneDocType = (milestoneText: string | null | undefined, tradeType?: string | null) => {
    const text = String(milestoneText || "").toUpperCase();
    if (text.includes("LORRY") || text.includes("LR")) return "LORRY_RECEIPT";
    if (text.includes("LCL")) return "LCL_DRAFT";
    if (text.includes("BILL OF LADING") || text.includes("BL")) return "BILL_OF_LADING";
    if (text.includes("AIR WAYBILL") || text.includes("AWB")) return "AIR_WAYBILL";
    const normalizedTrade = String(tradeType || "").toUpperCase();
    return normalizedTrade === "INTERNATIONAL" ? "BILL_OF_LADING" : "LORRY_RECEIPT";
};

export const buildPaymentPlan = (paymentTerm: any, tradeType?: string | null) => {
    if (!paymentTerm) return null;
    const milestones: PaymentMilestone[] = [];
    const explicitMilestones = Array.isArray(paymentTerm?.milestones) ? paymentTerm.milestones : [];
    if (explicitMilestones.length > 0) {
        explicitMilestones.forEach((milestone: any) => {
            const percent = Number(milestone?.percent || 0);
            if (!percent) return;
            const triggerType = String(milestone?.triggerType || "DOC").toUpperCase();
            const triggerValue = String(milestone?.triggerValue || milestone?.label || "").trim();
            if (triggerType === "STAGE") {
                milestones.push({
                    label: String(milestone?.label || "Milestone").trim() || "Milestone",
                    percent,
                    dueAtDocType: null,
                    dueAtStageKey: String(triggerValue || "").toUpperCase(),
                    status: "PENDING",
                });
                return;
            }
            const resolvedDocType = triggerValue.includes("_")
                ? normalizeDocType(triggerValue)
                : resolveMilestoneDocType(triggerValue || String(milestone?.label || ""), tradeType);
            milestones.push({
                label: String(milestone?.label || "Milestone").trim() || "Milestone",
                percent,
                dueAtDocType: resolvedDocType,
                status: "PENDING",
            });
        });
        return { milestones };
    }

    const advancePercent = Number(paymentTerm?.advancePercent || 0);
    const balancePercent = Number(paymentTerm?.balancePercent || 0);

    if (advancePercent > 0) {
        milestones.push({
            label: "Advance",
            percent: advancePercent,
            dueAtDocType: "PROFORMA_INVOICE",
            status: "PENDING",
        });
    }

    if (balancePercent > 0) {
        const milestoneLabel = String(paymentTerm?.milestone || "Balance").trim() || "Balance";
        milestones.push({
            label: milestoneLabel,
            percent: balancePercent,
            dueAtDocType: resolveMilestoneDocType(milestoneLabel, tradeType),
            status: "PENDING",
        });
    }

    return { milestones };
};

export const buildPaymentPlanFromTermId = async (paymentTermId?: Types.ObjectId | null, tradeType?: string | null) => {
    if (!paymentTermId) return null;
    const paymentTerm = await PaymentTermModel.findById(paymentTermId).lean();
    if (!paymentTerm) return null;
    return buildPaymentPlan(paymentTerm, tradeType);
};

export const applyPaymentPlanDocUpdate = async (orderId: Types.ObjectId, docType: string, verifiedStatus?: string | null) => {
    if (!orderId) return;
    const normalizedDocType = normalizeDocType(docType);
    if (!normalizedDocType) return;

    const order = await OrderModel.findById(orderId).select("paymentPlan").lean();
    const milestones: PaymentMilestone[] = Array.isArray((order as any)?.paymentPlan?.milestones)
        ? (order as any).paymentPlan.milestones
        : [];
    if (milestones.length === 0) return;

    const isVerified = ["VERIFIED", "APPROVED"].includes(String(verifiedStatus || "").toUpperCase());

    let touched = false;
    const nextMilestones = milestones.map((milestone) => {
        if (normalizeDocType(milestone.dueAtDocType) !== normalizedDocType) return milestone;
        if (isVerified) {
            if (milestone.status !== "PAID") {
                touched = true;
                return { ...milestone, status: "PAID" };
            }
            return milestone;
        }
        if (milestone.status === "PENDING") {
            touched = true;
            return { ...milestone, status: "DUE" };
        }
        return milestone;
    });

    if (!touched) return;
    await OrderModel.findByIdAndUpdate(orderId, {
        $set: { "paymentPlan.milestones": nextMilestones },
    });
};

export const applyPaymentPlanStageUpdate = async (orderId: Types.ObjectId, stageKey: string) => {
    if (!orderId || !stageKey) return;
    const normalizedStageKey = String(stageKey || "").toUpperCase().trim();
    if (!normalizedStageKey) return;

    const order = await OrderModel.findById(orderId).select("paymentPlan").lean();
    const milestones: PaymentMilestone[] = Array.isArray((order as any)?.paymentPlan?.milestones)
        ? (order as any).paymentPlan.milestones
        : [];
    if (milestones.length === 0) return;

    let touched = false;
    const nextMilestones = milestones.map((milestone) => {
        const dueStage = String(milestone.dueAtStageKey || "").toUpperCase();
        if (!dueStage || dueStage !== normalizedStageKey) return milestone;
        if (milestone.status === "PENDING") {
            touched = true;
            return { ...milestone, status: "DUE" };
        }
        return milestone;
    });

    if (!touched) return;
    await OrderModel.findByIdAndUpdate(orderId, {
        $set: { "paymentPlan.milestones": nextMilestones },
    });
};
