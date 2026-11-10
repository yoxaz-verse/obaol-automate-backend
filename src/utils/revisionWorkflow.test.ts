import { describe, expect, it } from "vitest";
import {
    allSupplierRevisionDecisionsSubmitted,
    hasSupplierRevisionDecision,
    normalizeSupplierRevisionDecisions,
    resolveSupplierRevisionDecision,
} from "./revisionWorkflow";

describe("revision workflow decisions", () => {
    it("distinguishes accepted and countered seller decisions", () => {
        expect(resolveSupplierRevisionDecision({ supplierAcknowledged: true })).toBe("ACCEPTED");
        expect(resolveSupplierRevisionDecision({ supplierAcknowledged: true, supplierCounterRate: 120 })).toBe("COUNTERED");
        expect(resolveSupplierRevisionDecision({ supplierCounterPaymentTermId: "term-id" })).toBe("COUNTERED");
        expect(resolveSupplierRevisionDecision({ supplierCounterDeliveryMode: "PRODUCT_READY", supplierCounterDeliveryDate: new Date() })).toBe("COUNTERED");
    });

    it("requires a decision for every item in a multi-item revision", () => {
        const items = [
            { key: "RATE", supplierReplyStatus: "ACCEPTED" },
            { key: "PAYMENT_TERMS", supplierReplyStatus: "COUNTERED" },
            { key: "DELIVERY_TIMELINE", supplierAcknowledged: true },
        ];
        expect(allSupplierRevisionDecisionsSubmitted(items)).toBe(true);
        expect(allSupplierRevisionDecisionsSubmitted([...items, { key: "OTHER" }])).toBe(false);
    });

    it("normalizes legacy acknowledgements without mutating source items", () => {
        const source = [{ key: "RATE", supplierAcknowledged: true }];
        const normalized = normalizeSupplierRevisionDecisions(source);
        expect(normalized[0].supplierReplyStatus).toBe("ACCEPTED");
        expect(source[0]).not.toHaveProperty("supplierReplyStatus");
        expect(hasSupplierRevisionDecision(normalized[0])).toBe(true);
    });
});
