export type SupplierRevisionDecision = "ACCEPTED" | "COUNTERED" | null;

export const hasRevisionCounter = (item: any): boolean =>
    (item?.supplierCounterRate !== null && item?.supplierCounterRate !== undefined) ||
    Boolean(item?.supplierCounterPaymentTermId) ||
    (Boolean(item?.supplierCounterDeliveryMode) && Boolean(item?.supplierCounterDeliveryDate));

export const resolveSupplierRevisionDecision = (item: any): SupplierRevisionDecision => {
    const explicit = String(item?.supplierReplyStatus || "").toUpperCase();
    if (explicit === "ACCEPTED" || explicit === "COUNTERED") return explicit;
    if (hasRevisionCounter(item)) return "COUNTERED";
    return item?.supplierAcknowledged ? "ACCEPTED" : null;
};

export const hasSupplierRevisionDecision = (item: any): boolean =>
    resolveSupplierRevisionDecision(item) !== null;

export const allSupplierRevisionDecisionsSubmitted = (items: any[]): boolean =>
    items.length > 0 && items.every(hasSupplierRevisionDecision);

export const normalizeSupplierRevisionDecisions = (items: any[]): any[] =>
    items.map((item) => ({
        ...item,
        supplierReplyStatus: resolveSupplierRevisionDecision(item),
    }));
