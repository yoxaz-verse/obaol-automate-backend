import { PaymentTermModel } from "../database/models/paymentTerm";

const DEFAULT_PAYMENT_TERMS = [
    {
        label: "Advance + LLR (10/90)",
        advancePercent: 10,
        balancePercent: 90,
        milestone: "On Lorry Receipt",
        notes: "Small advance, balance against LLR/LR.",
        applicableIncoterms: ["EXW"],
        milestones: [
            { label: "Advance", percent: 10, triggerType: "DOC", triggerValue: "PROFORMA_INVOICE" },
            { label: "On Lorry Receipt", percent: 90, triggerType: "DOC", triggerValue: "LORRY_RECEIPT" },
        ],
        isDefault: true,
    },
    {
        label: "FOB 20/80 on BL",
        advancePercent: 20,
        balancePercent: 80,
        milestone: "On Bill of Lading",
        notes: "Advance + balance against BL.",
        applicableIncoterms: ["FOB"],
        milestones: [
            { label: "Advance", percent: 20, triggerType: "DOC", triggerValue: "PROFORMA_INVOICE" },
            { label: "On Bill of Lading", percent: 80, triggerType: "DOC", triggerValue: "BILL_OF_LADING" },
        ],
        isDefault: false,
    },
    {
        label: "CIF 20/80 on Destination",
        advancePercent: 20,
        balancePercent: 80,
        milestone: "Arrival at Destination Port",
        notes: "Advance + balance on destination port arrival.",
        applicableIncoterms: ["CIF"],
        milestones: [
            { label: "Advance", percent: 20, triggerType: "DOC", triggerValue: "PROFORMA_INVOICE" },
            { label: "Arrival at Destination Port", percent: 80, triggerType: "STAGE", triggerValue: "DELIVERED" },
        ],
        isDefault: false,
    },
    {
        label: "100% Advance",
        advancePercent: 100,
        balancePercent: 0,
        milestone: "Before shipment",
        notes: "Full payment in advance before dispatch.",
        applicableIncoterms: ["EXW", "FOB", "CIF"],
        milestones: [
            { label: "Advance", percent: 100, triggerType: "DOC", triggerValue: "PROFORMA_INVOICE" },
        ],
        isDefault: false,
    },
    {
        label: "50% Advance / 50% on BL",
        advancePercent: 50,
        balancePercent: 50,
        milestone: "On Bill of Lading",
        notes: "Balance payable against Bill of Lading.",
        applicableIncoterms: ["FOB", "CIF"],
        milestones: [
            { label: "Advance", percent: 50, triggerType: "DOC", triggerValue: "PROFORMA_INVOICE" },
            { label: "On Bill of Lading", percent: 50, triggerType: "DOC", triggerValue: "BILL_OF_LADING" },
        ],
        isDefault: false,
    },
    {
        label: "30% Advance / 70% on BL",
        advancePercent: 30,
        balancePercent: 70,
        milestone: "On Bill of Lading",
        notes: "Balance payable against Bill of Lading.",
        applicableIncoterms: ["FOB", "CIF"],
        milestones: [
            { label: "Advance", percent: 30, triggerType: "DOC", triggerValue: "PROFORMA_INVOICE" },
            { label: "On Bill of Lading", percent: 70, triggerType: "DOC", triggerValue: "BILL_OF_LADING" },
        ],
        isDefault: false,
    },
    {
        label: "100% on Delivery",
        advancePercent: 0,
        balancePercent: 100,
        milestone: "On Delivery",
        notes: "Payment due upon delivery confirmation.",
        applicableIncoterms: ["FOB", "CIF"],
        milestones: [
            { label: "On Delivery", percent: 100, triggerType: "STAGE", triggerValue: "DELIVERED" },
        ],
        isDefault: false,
    }
];

export const seedPaymentTerms = async () => {
    for (const term of DEFAULT_PAYMENT_TERMS) {
        await PaymentTermModel.updateOne(
            { label: term.label },
            { $set: term, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
        );
    }
    await PaymentTermModel.updateMany(
        { label: { $ne: "Advance + LLR (10/90)" } },
        { $set: { isDefault: false } }
    );
};
