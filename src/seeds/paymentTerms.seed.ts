import { PaymentTermModel } from "../database/models/paymentTerm";

const DEFAULT_PAYMENT_TERMS = [
    {
        label: "100% Advance",
        advancePercent: 100,
        balancePercent: 0,
        milestone: "Before shipment",
        notes: "Full payment in advance before dispatch."
    },
    {
        label: "50% Advance / 50% on BL",
        advancePercent: 50,
        balancePercent: 50,
        milestone: "On Bill of Lading",
        notes: "Balance payable against Bill of Lading."
    },
    {
        label: "30% Advance / 70% on BL",
        advancePercent: 30,
        balancePercent: 70,
        milestone: "On Bill of Lading",
        notes: "Balance payable against Bill of Lading."
    },
    {
        label: "100% on Delivery",
        advancePercent: 0,
        balancePercent: 100,
        milestone: "On Delivery",
        notes: "Payment due upon delivery confirmation."
    }
];

export const seedPaymentTerms = async () => {
    const existing = await PaymentTermModel.countDocuments();
    if (existing > 0) return;
    await PaymentTermModel.insertMany(DEFAULT_PAYMENT_TERMS);
};
