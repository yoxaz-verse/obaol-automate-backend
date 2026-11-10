export type InquiryPendingParty = "BUYER" | "SELLER" | "BOTH" | "EITHER" | null;

export interface InquiryWorkflowRuleLike {
    stageKey?: unknown;
    requiredActions?: unknown;
    requiredActionMode?: unknown;
    actionBy?: unknown;
}

export interface InquiryWorkflowSummary {
    stageKey: string;
    pendingParty: InquiryPendingParty;
    requiredActions: string[];
    completedActions: string[];
    pendingActions: string[];
    isSatisfied: boolean;
    hasWorkflowRule: boolean;
}

const normalizeAction = (value: unknown) => String(value || "").trim().toUpperCase();

export const isInquiryActionSatisfied = (inquiry: any, action: unknown): boolean => {
    const key = normalizeAction(action);
    const rounds = Array.isArray(inquiry?.revisionRounds) ? inquiry.revisionRounds : [];

    if (key === "SUPPLIER_ACCEPTED") return Boolean(inquiry?.sellerAcceptedAt);
    if (key === "BUYER_CONFIRMED") return Boolean(inquiry?.buyerConfirmedAt);
    if (key === "CLARIFICATION_REQUESTED") return Boolean(inquiry?.clarificationRequestedAt || inquiry?.revisionRequestedAt);
    if (key === "LOI_SUBMITTED") return Boolean(inquiry?.loiSubmittedAt);
    if (key === "SUPPLIER_QTY_CONFIRMED") return Boolean(inquiry?.supplierQtyConfirmedAt);
    if (key === "REVISION_REQUESTED") return Boolean(rounds.length) || Boolean(inquiry?.revisionRequestedAt);
    if (key === "REVISION_CONFIRMED") {
        return rounds.some((round: any) => String(round?.status || "").toUpperCase() === "CONFIRMED") ||
            Boolean(inquiry?.revisionThread?.buyerConfirmedAt);
    }
    if (key === "REVISION_SKIPPED") {
        return rounds.some((round: any) => String(round?.status || "").toUpperCase() === "SKIPPED");
    }
    if (key === "QUOTATION_CREATED") return Boolean(inquiry?.quotationCreatedAt);
    if (key === "QUOTATION_ACCEPTED") return Boolean(inquiry?.buyerConfirmedAt);
    if (key === "RETURN_TO_REVISION") return Boolean(inquiry?.revisionRequestedAt);
    if (key === "RESPONSIBILITIES_FINALIZED") return Boolean(inquiry?.responsibilitiesFinalizedAt);
    if (key === "PROFORMA_CREATED") return Boolean(inquiry?.proformaCreatedAt);
    if (key === "OTHER_DOCS_UPLOADED" || key === "OTHER_DOCS_SKIPPED") return Boolean(inquiry?.otherDocsCompletedAt);
    if (key === "PO_UPLOADED" || key === "PO_SKIPPED") return Boolean(inquiry?.poSubmittedAt);
    if (key === "CONVERT_TO_ORDER") return ["CONVERTED", "COMPLETED", "CLOSED"].includes(String(inquiry?.status || "").toUpperCase());
    return false;
};

export const buildInquiryWorkflowSummary = (
    inquiry: any,
    rule?: InquiryWorkflowRuleLike | null,
): InquiryWorkflowSummary => {
    const stageKey = String(inquiry?.workflowStage || rule?.stageKey || "").trim().toUpperCase();
    const requiredActions = Array.isArray(rule?.requiredActions)
        ? rule!.requiredActions.map(normalizeAction).filter(Boolean)
        : [];
    const completedActions = requiredActions.filter((action) => isInquiryActionSatisfied(inquiry, action));
    const mode = String(rule?.requiredActionMode || "ALL").toUpperCase();
    const isSatisfied = requiredActions.length === 0 ||
        (mode === "ANY" ? completedActions.length > 0 : completedActions.length === requiredActions.length);
    const pendingActions = isSatisfied
        ? []
        : requiredActions.filter((action) => !completedActions.includes(action));
    const rawOwner = String(rule?.actionBy || "").toUpperCase();
    const pendingParty: InquiryPendingParty = isSatisfied
        ? null
        : rawOwner === "SUPPLIER" || rawOwner === "SELLER"
            ? "SELLER"
            : (["BUYER", "BOTH", "EITHER"].includes(rawOwner) ? rawOwner as InquiryPendingParty : null);

    return {
        stageKey,
        pendingParty,
        requiredActions,
        completedActions,
        pendingActions,
        isSatisfied,
        hasWorkflowRule: Boolean(rule),
    };
};
