import { FlowRuleModel } from "../database/models/flowRule";
import { EnquiryRuleModel } from "../database/models/enquiryRule";
import { OrderRuleModel } from "../database/models/orderRule";

const DEFAULT_TRADE_ENQUIRY = [
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "INQUIRY_CREATED",
    label: "Inquiry Created",
    description: "New enquiry created",
    sortOrder: 10,
    isActive: true,
    requiredActions: ["SUPPLIER_ACCEPTED"],
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "QUOTATION_SUBMITTED",
    label: "Quotation Submitted",
    description: "Supplier accepted and quotation provided",
    sortOrder: 20,
    isActive: true,
    requiredActions: ["BUYER_CONFIRMED"],
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "QUOTATION_REVISED",
    label: "Quotation Revised",
    description: "Quotation updated/revised",
    sortOrder: 30,
    isActive: true,
    requiredActions: [],
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "PROFORMA_ISSUED",
    label: "Proforma Issued",
    description: "Execution responsibilities finalized",
    sortOrder: 40,
    isActive: true,
    requiredActions: ["RESPONSIBILITIES_FINALIZED"],
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "PURCHASE_ORDER_RECEIVED",
    label: "Purchase Order Received",
    description: "PO received from buyer",
    sortOrder: 50,
    isActive: true,
    requiredActions: [],
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "ORDER_CONFIRMED",
    label: "Order Confirmed",
    description: "Order confirmed and created",
    sortOrder: 60,
    isActive: true,
    requiredActions: [],
    triggersOrderCreation: true,
  },
];

const DEFAULT_TRADE_ORDER = [
  { flowType: "TRADE_ORDER", stageKey: "ORDER_CREATED", label: "Order Created", sortOrder: 10, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "CONTRACT_SIGNED", label: "Contract Signed", sortOrder: 20, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "PRODUCTION_STARTED", label: "Production Started", sortOrder: 30, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "QUALITY_VERIFIED", label: "Quality Verified", sortOrder: 40, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "COMPLIANCE_APPROVED", label: "Compliance Approved", sortOrder: 50, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "PACKING_COMPLETED", label: "Packing Completed", sortOrder: 60, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "READY_FOR_SHIPMENT", label: "Ready For Shipment", sortOrder: 70, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "SHIPPED", label: "Shipped", sortOrder: 80, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "DELIVERED", label: "Delivered", sortOrder: 90, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "PAYMENT_PENDING", label: "Payment Pending", sortOrder: 100, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "PAYMENT_COMPLETED", label: "Payment Completed", sortOrder: 110, tradeType: "BOTH" },
  { flowType: "TRADE_ORDER", stageKey: "TRADE_CLOSED", label: "Trade Closed", sortOrder: 120, triggersClose: true, tradeType: "BOTH" },
];

const DEFAULT_SAMPLING = [
  { flowType: "SAMPLING", stageKey: "REQUESTED", label: "Requested", sortOrder: 10 },
  { flowType: "SAMPLING", stageKey: "QUOTED", label: "Quoted", sortOrder: 20 },
  { flowType: "SAMPLING", stageKey: "BUYER_ACCEPTED", label: "Buyer Accepted", sortOrder: 30 },
  { flowType: "SAMPLING", stageKey: "CONFIRMED", label: "Confirmed", sortOrder: 40 },
  { flowType: "SAMPLING", stageKey: "CLOSED", label: "Closed", sortOrder: 50 },
];

const DEFAULT_WAREHOUSE = [
  { flowType: "WAREHOUSE", stageKey: "INBOUND_REQUESTED", label: "Inbound Requested", sortOrder: 10 },
  { flowType: "WAREHOUSE", stageKey: "RECEIVED", label: "Received", sortOrder: 20 },
  { flowType: "WAREHOUSE", stageKey: "STORED", label: "Stored", sortOrder: 30 },
  { flowType: "WAREHOUSE", stageKey: "OUTBOUND_REQUESTED", label: "Outbound Requested", sortOrder: 40 },
  { flowType: "WAREHOUSE", stageKey: "RELEASED", label: "Released", sortOrder: 50 },
];

const buildDefaults = () => [
  ...DEFAULT_TRADE_ENQUIRY,
  ...DEFAULT_TRADE_ORDER,
  ...DEFAULT_SAMPLING,
  ...DEFAULT_WAREHOUSE,
].map((rule) => ({
  ...rule,
  stageKey: String(rule.stageKey).toUpperCase(),
  label: String(rule.label || "").trim(),
  description: String((rule as any).description || ""),
  isActive: (rule as any).isActive !== false,
  requiredActions: Array.isArray((rule as any).requiredActions) ? (rule as any).requiredActions : [],
  triggersOrderCreation: Boolean((rule as any).triggersOrderCreation),
  triggersClose: Boolean((rule as any).triggersClose),
  tradeType: (rule as any).tradeType || "BOTH",
  isDeleted: false,
}));

const migrateFromLegacy = async () => {
  const legacyEnquiry = await EnquiryRuleModel.find({ isDeleted: { $ne: true } }).lean();
  const legacyOrder = await OrderRuleModel.find({ isDeleted: { $ne: true } }).lean();

  const mappedEnquiry = (legacyEnquiry || []).map((rule: any) => ({
    flowType: "TRADE_ENQUIRY",
    stageKey: String(rule.stageKey || "").toUpperCase(),
    label: String(rule.label || ""),
    description: String(rule.description || ""),
    sortOrder: Number(rule.sortOrder || 0),
    isActive: rule.isActive !== false,
    requiredActions: Array.isArray(rule.requiredActions) ? rule.requiredActions : [],
    triggersOrderCreation: Boolean(rule.triggersOrderCreation),
    isDeleted: false,
  }));

  const mappedOrder = (legacyOrder || []).map((rule: any) => ({
    flowType: "TRADE_ORDER",
    stageKey: String(rule.stageKey || "").toUpperCase(),
    label: String(rule.label || ""),
    description: String(rule.description || ""),
    sortOrder: Number(rule.sortOrder || 0),
    isActive: rule.isActive !== false,
    tradeType: String(rule.tradeType || "BOTH").toUpperCase(),
    triggersClose: Boolean(rule.triggersClose),
    isDeleted: false,
  }));

  const hasLegacy = mappedEnquiry.length > 0 || mappedOrder.length > 0;
  const base = hasLegacy ? [...mappedEnquiry, ...mappedOrder] : ([...DEFAULT_TRADE_ENQUIRY, ...DEFAULT_TRADE_ORDER] as any[]).map((r) => ({
    ...r,
    stageKey: String(r.stageKey).toUpperCase(),
    label: String(r.label || ""),
    description: String(r.description || ""),
    isActive: true,
    requiredActions: Array.isArray(r.requiredActions) ? r.requiredActions : [],
    triggersOrderCreation: Boolean(r.triggersOrderCreation),
    triggersClose: Boolean(r.triggersClose),
    tradeType: r.tradeType || "BOTH",
    isDeleted: false,
  }));

  return [
    ...base,
    ...DEFAULT_SAMPLING.map((r) => ({
      ...r,
      stageKey: String(r.stageKey).toUpperCase(),
      label: String(r.label || ""),
      description: "",
      isActive: true,
      requiredActions: [],
      isDeleted: false,
    })),
    ...DEFAULT_WAREHOUSE.map((r) => ({
      ...r,
      stageKey: String(r.stageKey).toUpperCase(),
      label: String(r.label || ""),
      description: "",
      isActive: true,
      requiredActions: [],
      isDeleted: false,
    })),
  ];
};

export const ensureDefaultFlowRules = async () => {
  const count = await FlowRuleModel.countDocuments({ isDeleted: { $ne: true } });
  if (count > 0) return;
  const defaults = await migrateFromLegacy();
  await FlowRuleModel.insertMany(defaults);
};

export const seedDefaultFlowRules = async (force = false, flowType?: string) => {
  if (force) {
    const filter: any = { isDeleted: { $ne: true } };
    if (flowType) filter.flowType = String(flowType).toUpperCase();
    await FlowRuleModel.updateMany(filter, { isDeleted: true });
  }

  if (flowType) {
    const type = String(flowType).toUpperCase();
    const existing = await FlowRuleModel.countDocuments({ isDeleted: { $ne: true }, flowType: type });
    if (existing > 0) return;
    const allDefaults = buildDefaults();
    const scoped = allDefaults.filter((r: any) => String(r.flowType) === type);
    if (scoped.length) await FlowRuleModel.insertMany(scoped);
    return;
  }

  await ensureDefaultFlowRules();
};
