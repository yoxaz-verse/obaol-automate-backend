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

const DEFAULT_PROCUREMENT = [
  { flowType: "PROCUREMENT", stageKey: "PROCUREMENT_SPECIALIST_ASSIGNED", label: "Procurement Specialist Assigned", sortOrder: 10 },
  { flowType: "PROCUREMENT", stageKey: "ON_SITE_VISIT_PRESENCE", label: "On-Site Visit & Presence", sortOrder: 20 },
  { flowType: "PROCUREMENT", stageKey: "STOCK_QUANTITY_VERIFIED", label: "Stock Quantity Verification", sortOrder: 30 },
  { flowType: "PROCUREMENT", stageKey: "QUALITY_INSPECTION", label: "Quality Inspection", sortOrder: 40 },
  { flowType: "PROCUREMENT", stageKey: "PHOTO_VIDEO_CONFIRMATION", label: "Photo & Video Confirmation", sortOrder: 50 },
  { flowType: "PROCUREMENT", stageKey: "PACKAGING_VALIDATION", label: "Packaging Validation", sortOrder: 60 },
  { flowType: "PROCUREMENT", stageKey: "TRANSPORT_READINESS_CHECK", label: "Transport Readiness Check", sortOrder: 70 },
  { flowType: "PROCUREMENT", stageKey: "LOADING_SUPERVISED", label: "Loading Supervision", sortOrder: 80 },
  { flowType: "PROCUREMENT", stageKey: "PAYMENT_CHECKPOINT", label: "Payment Checkpoint", sortOrder: 90 },
  { flowType: "PROCUREMENT", stageKey: "HANDOVER_TO_LOGISTICS", label: "Handover to Logistics", sortOrder: 100 },
];

const DEFAULT_LOGISTICS = [
  { flowType: "LOGISTICS", stageKey: "PICKUP_SCHEDULED", label: "Pickup Scheduled", sortOrder: 10 },
  { flowType: "LOGISTICS", stageKey: "VEHICLE_ARRIVED", label: "Vehicle Arrived", sortOrder: 20 },
  { flowType: "LOGISTICS", stageKey: "LOADING_CONFIRMED", label: "Loading Confirmed", sortOrder: 30 },
  { flowType: "LOGISTICS", stageKey: "IN_TRANSIT", label: "In Transit", sortOrder: 40 },
  { flowType: "LOGISTICS", stageKey: "ARRIVED_AT_DESTINATION", label: "Arrived at Destination", sortOrder: 50 },
  { flowType: "LOGISTICS", stageKey: "UNLOADED_HANDED_OVER", label: "Unloaded & Handed Over", sortOrder: 60 },
];

const DEFAULT_INLAND_LOGISTICS = [
  { flowType: "INLAND_LOGISTICS", stageKey: "VEHICLE_ASSIGNED", label: "Vehicle Assigned", sortOrder: 10 },
  { flowType: "INLAND_LOGISTICS", stageKey: "PICKUP_CONFIRMED", label: "Pickup Confirmed", sortOrder: 20 },
  { flowType: "INLAND_LOGISTICS", stageKey: "IN_TRANSIT", label: "In Transit", sortOrder: 30 },
  { flowType: "INLAND_LOGISTICS", stageKey: "REACHED_HUB", label: "Reached Hub", sortOrder: 40 },
  { flowType: "INLAND_LOGISTICS", stageKey: "HANDOVER_COMPLETED", label: "Handover Completed", sortOrder: 50 },
];

const DEFAULT_PACKAGING = [
  { flowType: "PACKAGING", stageKey: "PACKAGING_REQUEST_RECEIVED", label: "Packaging Request Received", sortOrder: 10 },
  { flowType: "PACKAGING", stageKey: "PACKAGING_STARTED", label: "Packaging Started", sortOrder: 20 },
  { flowType: "PACKAGING", stageKey: "PACKAGING_COMPLETED", label: "Packaging Completed", sortOrder: 30 },
  { flowType: "PACKAGING", stageKey: "QA_APPROVED", label: "QA Approved", sortOrder: 40 },
  { flowType: "PACKAGING", stageKey: "READY_FOR_DISPATCH", label: "Ready for Dispatch", sortOrder: 50 },
];

const DEFAULT_FREIGHT_FORWARDING = [
  { flowType: "FREIGHT_FORWARDING", stageKey: "BOOKING_REQUESTED", label: "Booking Requested", sortOrder: 10 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "BOOKING_CONFIRMED", label: "Booking Confirmed", sortOrder: 20 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "DOCS_SUBMITTED", label: "Documents Submitted", sortOrder: 30 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "CARGO_LOADED", label: "Cargo Loaded", sortOrder: 40 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "IN_TRANSIT", label: "In Transit", sortOrder: 50 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "ARRIVED", label: "Arrived", sortOrder: 60 },
];

const DEFAULT_INVENTORY = [
  { flowType: "INVENTORY", stageKey: "STOCK_IN", label: "Stock In", sortOrder: 10 },
  { flowType: "INVENTORY", stageKey: "QUALITY_CHECKED", label: "Quality Checked", sortOrder: 20 },
  { flowType: "INVENTORY", stageKey: "AVAILABLE", label: "Available", sortOrder: 30 },
  { flowType: "INVENTORY", stageKey: "RESERVED", label: "Reserved", sortOrder: 40 },
  { flowType: "INVENTORY", stageKey: "OUTBOUND_REQUESTED", label: "Outbound Requested", sortOrder: 50 },
  { flowType: "INVENTORY", stageKey: "DISPATCHED", label: "Dispatched", sortOrder: 60 },
];

const buildDefaults = () => [
  ...DEFAULT_TRADE_ENQUIRY,
  ...DEFAULT_TRADE_ORDER,
  ...DEFAULT_SAMPLING,
  ...DEFAULT_WAREHOUSE,
  ...DEFAULT_PROCUREMENT,
  ...DEFAULT_LOGISTICS,
  ...DEFAULT_INLAND_LOGISTICS,
  ...DEFAULT_PACKAGING,
  ...DEFAULT_FREIGHT_FORWARDING,
  ...DEFAULT_INVENTORY,
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
    ...DEFAULT_PROCUREMENT.map((r) => ({
      ...r,
      stageKey: String(r.stageKey).toUpperCase(),
      label: String(r.label || ""),
      description: "",
      isActive: true,
      requiredActions: [],
      isDeleted: false,
    })),
    ...DEFAULT_LOGISTICS.map((r) => ({
      ...r,
      stageKey: String(r.stageKey).toUpperCase(),
      label: String(r.label || ""),
      description: "",
      isActive: true,
      requiredActions: [],
      isDeleted: false,
    })),
    ...DEFAULT_INLAND_LOGISTICS.map((r) => ({
      ...r,
      stageKey: String(r.stageKey).toUpperCase(),
      label: String(r.label || ""),
      description: "",
      isActive: true,
      requiredActions: [],
      isDeleted: false,
    })),
    ...DEFAULT_PACKAGING.map((r) => ({
      ...r,
      stageKey: String(r.stageKey).toUpperCase(),
      label: String(r.label || ""),
      description: "",
      isActive: true,
      requiredActions: [],
      isDeleted: false,
    })),
    ...DEFAULT_FREIGHT_FORWARDING.map((r) => ({
      ...r,
      stageKey: String(r.stageKey).toUpperCase(),
      label: String(r.label || ""),
      description: "",
      isActive: true,
      requiredActions: [],
      isDeleted: false,
    })),
    ...DEFAULT_INVENTORY.map((r) => ({
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
  await FlowRuleModel.updateMany(
    { isDeleted: { $ne: true }, flowType: "INTERNAL_LOGISTICS" },
    { flowType: "INLAND_LOGISTICS" }
  );
  const count = await FlowRuleModel.countDocuments({ isDeleted: { $ne: true } });
  if (count > 0) return;
  const defaults = await migrateFromLegacy();
  await FlowRuleModel.insertMany(defaults);
};

export const seedDefaultFlowRules = async (force = false, flowType?: string) => {
  await FlowRuleModel.updateMany(
    { isDeleted: { $ne: true }, flowType: "INTERNAL_LOGISTICS" },
    { flowType: "INLAND_LOGISTICS" }
  );
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
