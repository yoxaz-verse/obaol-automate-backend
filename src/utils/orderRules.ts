import { OrderRuleModel } from "../database/models/orderRule";

const DEFAULT_ORDER_RULES = [
    { stageKey: "ORDER_CREATED", label: "Order Created", sortOrder: 10, tradeType: "BOTH" },
    { stageKey: "CONTRACT_SIGNED", label: "Contract Signed", sortOrder: 20, tradeType: "BOTH" },
    { stageKey: "PRODUCTION_STARTED", label: "Production Started", sortOrder: 30, tradeType: "BOTH" },
    { stageKey: "QUALITY_VERIFIED", label: "Quality Verified", sortOrder: 40, tradeType: "BOTH" },
    { stageKey: "COMPLIANCE_APPROVED", label: "Compliance Approved", sortOrder: 50, tradeType: "BOTH" },
    { stageKey: "PACKING_COMPLETED", label: "Packing Completed", sortOrder: 60, tradeType: "BOTH" },
    { stageKey: "READY_FOR_SHIPMENT", label: "Ready For Shipment", sortOrder: 70, tradeType: "BOTH" },
    { stageKey: "SHIPPED", label: "Shipped", sortOrder: 80, tradeType: "BOTH" },
    { stageKey: "DELIVERED", label: "Delivered", sortOrder: 90, tradeType: "BOTH" },
    { stageKey: "PAYMENT_PENDING", label: "Payment Pending", sortOrder: 100, tradeType: "BOTH" },
    { stageKey: "PAYMENT_COMPLETED", label: "Payment Completed", sortOrder: 110, tradeType: "BOTH" },
    { stageKey: "TRADE_CLOSED", label: "Trade Closed", sortOrder: 120, triggersClose: true, tradeType: "BOTH" },
];

export const ensureDefaultOrderRules = async () => {
    const count = await OrderRuleModel.countDocuments({ isDeleted: { $ne: true } });
    if (count > 0) return;
    await OrderRuleModel.insertMany(
        DEFAULT_ORDER_RULES.map((rule) => ({
            ...rule,
            isActive: true,
            isDeleted: false,
        }))
    );
};

export const seedDefaultOrderRules = async (force = false) => {
    if (force) {
        await OrderRuleModel.updateMany({ isDeleted: { $ne: true } }, { isDeleted: true });
    }
    await ensureDefaultOrderRules();
};
