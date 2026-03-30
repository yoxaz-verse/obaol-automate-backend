import { FlowRuleModel } from "../database/models/flowRule";
import { EnquiryRuleModel } from "../database/models/enquiryRule";
import { OrderRuleModel } from "../database/models/orderRule";

const DEFAULT_TRADE_ENQUIRY = [
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "ENQUIRY_CREATED",
    label: "Enquiry Created",
    description: "LOI auto-created from buyer to seller",
    sortOrder: 10,
    isActive: true,
    requiredActions: ["LOI_SUBMITTED"],
    requiredActionMode: "ALL",
    actionBy: "BUYER",
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "LOI_ACCEPTED_QTY_CONFIRMED",
    label: "LOI Accepted & Quantity Confirmed",
    description: "Supplier confirms quantity and accepts LOI",
    sortOrder: 20,
    isActive: true,
    requiredActions: ["SUPPLIER_QTY_CONFIRMED"],
    requiredActionMode: "ALL",
    actionBy: "SUPPLIER",
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "QUOTATION_REVISION",
    label: "Quotation Revision",
    description: "Buyer requests revision via checklist",
    sortOrder: 30,
    isActive: true,
    requiredActions: ["REVISION_REQUESTED", "REVISION_CONFIRMED", "REVISION_SKIPPED"],
    requiredActionMode: "ANY",
    actionBy: "BUYER",
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "QUOTATION_CREATED",
    label: "Quotation Created",
    description: "Supplier creates quotation document",
    sortOrder: 40,
    isActive: true,
    requiredActions: ["QUOTATION_CREATED"],
    requiredActionMode: "ALL",
    actionBy: "SUPPLIER",
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "QUOTATION_DECISION",
    label: "Quotation Decision",
    description: "Buyer accepts or returns to revision",
    sortOrder: 50,
    isActive: true,
    requiredActions: ["QUOTATION_ACCEPTED", "RETURN_TO_REVISION"],
    requiredActionMode: "ANY",
    actionBy: "BUYER",
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "RESPONSIBILITIES_FINALIZED",
    label: "Responsibilities Finalized",
    description: "Both parties finalize responsibilities",
    sortOrder: 60,
    isActive: true,
    requiredActions: ["RESPONSIBILITIES_FINALIZED"],
    requiredActionMode: "ALL",
    actionBy: "BOTH",
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "PROFORMA_ISSUED",
    label: "Proforma Issued",
    description: "Supplier issues proforma invoice",
    sortOrder: 70,
    isActive: true,
    requiredActions: ["PROFORMA_CREATED"],
    requiredActionMode: "ALL",
    actionBy: "SUPPLIER",
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "OTHER_DOCUMENTS",
    label: "Other Documents",
    description: "NDA/Contract and similar documents",
    sortOrder: 80,
    isActive: true,
    requiredActions: ["OTHER_DOCS_UPLOADED", "OTHER_DOCS_SKIPPED"],
    requiredActionMode: "ANY",
    actionBy: "BOTH",
    triggersOrderCreation: false,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "PURCHASE_ORDER_CREATED",
    label: "Purchase Order Created",
    description: "Buyer uploads or skips purchase order",
    sortOrder: 90,
    isActive: true,
    requiredActions: ["PO_UPLOADED", "PO_SKIPPED"],
    requiredActionMode: "ANY",
    actionBy: "BUYER",
    triggersOrderCreation: true,
  },
  {
    flowType: "TRADE_ENQUIRY",
    stageKey: "CONVERT_TO_ORDER",
    label: "Convert to Order",
    description: "Finalize and convert enquiry into an order",
    sortOrder: 100,
    isActive: true,
    requiredActions: ["CONVERT_TO_ORDER"],
    requiredActionMode: "ALL",
    actionBy: "EITHER",
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
  {
    flowType: "PROCUREMENT",
    stageKey: "PROCUREMENT_SPECIALIST_ASSIGNED",
    label: "Procurement Specialist Assigned",
    description: "A nearby OBAOL procurement specialist is assigned based on supplier location, reducing travel time and delays.",
    sortOrder: 10,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "ON_SITE_VISIT_PRESENCE",
    label: "On-Site Visit & Presence",
    description: "Our representative visits the supplier location and acts on your behalf throughout the procurement process.",
    sortOrder: 20,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "STOCK_QUANTITY_VERIFIED",
    label: "Stock Quantity Verification",
    description: "Before transportation arrives, we verify that the promised quantity is physically available to prevent short loading.",
    sortOrder: 30,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "QUALITY_INSPECTION",
    label: "Quality Inspection",
    description: "Product quality is checked against agreed specifications to ensure readiness for dispatch.",
    sortOrder: 40,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "PHOTO_VIDEO_CONFIRMATION",
    label: "Photo & Video Confirmation",
    description: "Photos and videos of stock, packaging, and readiness are shared to provide real-time visibility.",
    sortOrder: 50,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "PACKAGING_VALIDATION",
    label: "Packaging Validation",
    description: "Packaging is confirmed to meet requirements before goods are prepared for transportation.",
    sortOrder: 60,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "TRANSPORT_READINESS_CHECK",
    label: "Transport Readiness Check",
    description: "We confirm that the transport vehicle has arrived, is suitable, and ready for loading.",
    sortOrder: 70,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "LOADING_SUPERVISED",
    label: "Loading Supervision",
    description: "Goods are supervised during loading to ensure correct handling and dispatch.",
    sortOrder: 80,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "PAYMENT_CHECKPOINT",
    label: "Payment Checkpoint",
    description: "If payment is linked to dispatch, we ensure required payments are received before release.",
    sortOrder: 90,
  },
  {
    flowType: "PROCUREMENT",
    stageKey: "HANDOVER_TO_LOGISTICS",
    label: "Handover to Logistics",
    description: "Once loading is complete, the shipment is handed over to the designated logistics partner.",
    sortOrder: 100,
  },
];

const DEFAULT_INLAND_TRANSPORTATION = [
  { flowType: "INLAND_TRANSPORTATION", stageKey: "PICKUP_SCHEDULED", label: "Pickup Scheduled", description: "Pickup time and route are confirmed with the carrier.", sortOrder: 10 },
  { flowType: "INLAND_TRANSPORTATION", stageKey: "VEHICLE_ARRIVED", label: "Vehicle Arrived", description: "Vehicle arrives at the pickup point and is ready to load.", sortOrder: 20 },
  { flowType: "INLAND_TRANSPORTATION", stageKey: "LOADING_CONFIRMED", label: "Loading Confirmed", description: "Loading is completed and quantity is verified.", sortOrder: 30 },
  { flowType: "INLAND_TRANSPORTATION", stageKey: "IN_TRANSIT", label: "In Transit", description: "Shipment is moving toward the destination.", sortOrder: 40 },
  { flowType: "INLAND_TRANSPORTATION", stageKey: "ARRIVED_AT_DESTINATION", label: "Arrived at Destination", description: "Vehicle reaches the destination hub or delivery point.", sortOrder: 50 },
  { flowType: "INLAND_TRANSPORTATION", stageKey: "UNLOADED_HANDED_OVER", label: "Unloaded & Handed Over", description: "Cargo is unloaded and handed over to the receiving party.", sortOrder: 60 },
];

const DEFAULT_PACKAGING = [
  { flowType: "PACKAGING", stageKey: "PACKAGING_REQUEST_RECEIVED", label: "Packaging Request Received", description: "Packaging requirements are received and confirmed.", sortOrder: 10 },
  { flowType: "PACKAGING", stageKey: "PACKAGING_STARTED", label: "Packaging Started", description: "Packaging work begins as per specifications.", sortOrder: 20 },
  { flowType: "PACKAGING", stageKey: "PACKAGING_COMPLETED", label: "Packaging Completed", description: "Packaging is completed and sealed.", sortOrder: 30 },
  { flowType: "PACKAGING", stageKey: "QA_APPROVED", label: "QA Approved", description: "Packaging quality is verified and approved.", sortOrder: 40 },
  { flowType: "PACKAGING", stageKey: "READY_FOR_DISPATCH", label: "Ready for Dispatch", description: "Packages are staged and ready for loading.", sortOrder: 50 },
];

const DEFAULT_FREIGHT_FORWARDING = [
  { flowType: "FREIGHT_FORWARDING", stageKey: "BOOKING_REQUESTED", label: "Booking Requested", description: "Forwarding booking request is raised with the carrier.", sortOrder: 10 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "BOOKING_CONFIRMED", label: "Booking Confirmed", description: "Booking is confirmed and slot is reserved.", sortOrder: 20 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "DOCS_SUBMITTED", label: "Documents Submitted", description: "Required documents are submitted for clearance.", sortOrder: 30 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "CARGO_LOADED", label: "Cargo Loaded", description: "Cargo is loaded onto the vessel or aircraft.", sortOrder: 40 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "IN_TRANSIT", label: "In Transit", description: "Freight is in transit to destination port/airport.", sortOrder: 50 },
  { flowType: "FREIGHT_FORWARDING", stageKey: "ARRIVED", label: "Arrived", description: "Freight has arrived at destination.", sortOrder: 60 },
];

const DEFAULT_CERTIFICATION = [
  { flowType: "CERTIFICATION", stageKey: "DOCS_COLLECTED", label: "Docs Collected", description: "Required certification documents are collected.", sortOrder: 10 },
  { flowType: "CERTIFICATION", stageKey: "CERTIFICATION_SUBMITTED", label: "Certification Submitted", description: "Certification submission is filed with the authority.", sortOrder: 20 },
  { flowType: "CERTIFICATION", stageKey: "CERTIFIED", label: "Certified", description: "Certification is approved and confirmed.", sortOrder: 30 },
];

const DEFAULT_QUALITY_QA = [
  { flowType: "QUALITY_QA", stageKey: "SAMPLE_SENT", label: "Sample Sent", description: "Samples are sent for lab or QA testing.", sortOrder: 10 },
  { flowType: "QUALITY_QA", stageKey: "LAB_PENDING", label: "Lab Pending", description: "Lab analysis is in progress.", sortOrder: 20 },
  { flowType: "QUALITY_QA", stageKey: "QA_APPROVED", label: "QA Approved", description: "Quality assurance is approved.", sortOrder: 30 },
];

const DEFAULT_INVENTORY = [
  { flowType: "INVENTORY", stageKey: "STOCK_IN", label: "Stock In", description: "Inventory is received into storage.", sortOrder: 10 },
  { flowType: "INVENTORY", stageKey: "QUALITY_CHECKED", label: "Quality Checked", description: "Incoming stock is inspected and verified.", sortOrder: 20 },
  { flowType: "INVENTORY", stageKey: "AVAILABLE", label: "Available", description: "Stock is marked available for allocation.", sortOrder: 30 },
  { flowType: "INVENTORY", stageKey: "RESERVED", label: "Reserved", description: "Inventory is reserved against an order.", sortOrder: 40 },
  { flowType: "INVENTORY", stageKey: "OUTBOUND_REQUESTED", label: "Outbound Requested", description: "Dispatch is requested from inventory.", sortOrder: 50 },
  { flowType: "INVENTORY", stageKey: "DISPATCHED", label: "Dispatched", description: "Inventory has been dispatched out of storage.", sortOrder: 60 },
];

const buildDefaults = () => {
  const defaults = [
    ...DEFAULT_TRADE_ENQUIRY,
    ...DEFAULT_TRADE_ORDER,
    ...DEFAULT_SAMPLING,
    ...DEFAULT_WAREHOUSE,
    ...DEFAULT_PROCUREMENT,
    ...DEFAULT_INLAND_TRANSPORTATION,
    ...DEFAULT_PACKAGING,
    ...DEFAULT_FREIGHT_FORWARDING,
    ...DEFAULT_CERTIFICATION,
    ...DEFAULT_QUALITY_QA,
    ...DEFAULT_INVENTORY,
  ].map((rule) => ({
    ...rule,
    stageKey: String(rule.stageKey).toUpperCase(),
    label: String(rule.label || "").trim(),
    description: String((rule as any).description || ""),
    isActive: (rule as any).isActive !== false,
    requiredActions: Array.isArray((rule as any).requiredActions) ? (rule as any).requiredActions : [],
    requiredActionMode: (rule as any).requiredActionMode || "ALL",
    triggersOrderCreation: Boolean((rule as any).triggersOrderCreation),
    triggersClose: Boolean((rule as any).triggersClose),
    tradeType: (rule as any).tradeType || "BOTH",
    isDeleted: false,
  }));

  const seen = new Set<string>();
  return defaults.filter((rule: any) => {
    const key = `${String(rule.flowType).toUpperCase()}::${String(rule.stageKey).toUpperCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getDefaultDescriptionMap = () => {
  const map = new Map<string, string>();
  const allDefaults = buildDefaults();
  allDefaults.forEach((rule: any) => {
    const key = `${String(rule.flowType)}::${String(rule.stageKey)}`;
    if (rule.description) {
      map.set(key, String(rule.description));
    }
  });
  return map;
};

const backfillFlowRuleDescriptions = async (flowType?: string) => {
  const filter: any = { isDeleted: { $ne: true } };
  if (flowType) filter.flowType = String(flowType).toUpperCase();
  const rules = await FlowRuleModel.find(filter).lean();
  if (!rules.length) return;
  const descriptionMap = getDefaultDescriptionMap();
  const bulk = rules
    .filter((rule: any) => !rule.description)
    .map((rule: any) => {
      const key = `${String(rule.flowType)}::${String(rule.stageKey)}`;
      const description = descriptionMap.get(key);
      if (!description) return null;
      return {
        updateOne: {
          filter: { _id: rule._id },
          update: { $set: { description } },
        },
      };
    })
    .filter(Boolean) as any[];

  if (bulk.length) {
    await FlowRuleModel.bulkWrite(bulk);
  }
};

const normalizeFlowTypes = async () => {
  const rules = await FlowRuleModel.find({}).select({ _id: 1, flowType: 1, stageKey: 1 }).lean();
  if (!rules.length) return;
  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  rules.forEach((rule: any) => {
    const normalizedFlowType = String(rule.flowType || "").toUpperCase().trim();
    const normalizedStageKey = String(rule.stageKey || "").toUpperCase().trim();
    if (!normalizedFlowType || !normalizedStageKey) return;
    const key = `${normalizedFlowType}::${normalizedStageKey}`;
    if (seen.has(key)) {
      duplicateIds.push(String(rule._id));
      return;
    }
    seen.add(key);
  });

  if (duplicateIds.length) {
    await FlowRuleModel.updateMany(
      { _id: { $in: duplicateIds } },
      { $set: { isDeleted: true } }
    );
  }

  const bulk = rules
    .map((rule: any) => {
      const normalizedFlowType = String(rule.flowType || "").toUpperCase().trim();
      const normalizedStageKey = String(rule.stageKey || "").toUpperCase().trim();
      if (!normalizedFlowType || !normalizedStageKey) return null;
      if (normalizedFlowType === rule.flowType && normalizedStageKey === rule.stageKey) return null;
      if (duplicateIds.includes(String(rule._id))) return null;
      return {
        updateOne: {
          filter: { _id: rule._id },
          update: { $set: { flowType: normalizedFlowType, stageKey: normalizedStageKey } },
        },
      };
    })
    .filter(Boolean) as any[];

  if (bulk.length) {
    await FlowRuleModel.bulkWrite(bulk);
  }
};

const hardDeleteFlowTypes = async (flowTypes: string[]) => {
  const normalized = Array.from(new Set(flowTypes.map((flowType) => String(flowType).toUpperCase().trim()))).filter(Boolean);
  if (!normalized.length) return;
  const regexes = normalized.map((flowType) => new RegExp(`^${flowType}$`, "i"));
  await FlowRuleModel.deleteMany({ flowType: { $in: regexes } });
};

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
    actionBy: rule.actionBy || null,
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
    ...DEFAULT_INLAND_TRANSPORTATION.map((r) => ({
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
    ...DEFAULT_CERTIFICATION.map((r) => ({
      ...r,
      stageKey: String(r.stageKey).toUpperCase(),
      label: String(r.label || ""),
      description: "",
      isActive: true,
      requiredActions: [],
      isDeleted: false,
    })),
    ...DEFAULT_QUALITY_QA.map((r) => ({
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
    { flowType: "TRADE_ENQUIRY", stageKey: "INQUIRY_CREATED" },
    { stageKey: "ENQUIRY_CREATED", label: "Enquiry Created" }
  );
  // Force reset TRADE_ENQUIRY to the current default if stages drifted
  try {
    const legacyStageKeys = new Set([
      "INQUIRY_CREATED",
      "QUOTE_REQUESTED",
      "QUOTATION_SUBMITTED",
      "QUOTATION_REVISED",
      "PROFORMA_ISSUED",
      "PURCHASE_ORDER_RECEIVED",
      "ORDER_CONFIRMED",
    ]);
    const defaultStageKeys = new Set(DEFAULT_TRADE_ENQUIRY.map((rule: any) => String(rule.stageKey).toUpperCase()));
    const existingStages = await FlowRuleModel.distinct("stageKey", { isDeleted: { $ne: true }, flowType: "TRADE_ENQUIRY" });
    const existingSet = new Set(existingStages.map((stage: any) => String(stage).toUpperCase()));
    const hasLegacyStages = Array.from(existingSet).some((key) => legacyStageKeys.has(key));
    const stagesMatch =
      defaultStageKeys.size === existingSet.size &&
      Array.from(defaultStageKeys).every((key) => existingSet.has(key));
    if (!stagesMatch || hasLegacyStages) {
      await hardDeleteFlowTypes(["TRADE_ENQUIRY"]);
      await FlowRuleModel.insertMany(DEFAULT_TRADE_ENQUIRY.map((rule) => ({
        ...rule,
        stageKey: String(rule.stageKey).toUpperCase(),
        label: String(rule.label || rule.stageKey),
        description: rule.description || "",
        requiredActionMode: String(rule.requiredActionMode || "ALL").toUpperCase(),
        isDeleted: false,
      })));
    }
  } catch (error) {
    console.error("[flowRules] Failed to reset TRADE_ENQUIRY defaults", error);
  }
  await normalizeFlowTypes();
  await FlowRuleModel.updateMany(
    { isDeleted: { $ne: true }, flowType: "INTERNAL_LOGISTICS" },
    { flowType: "INLAND_TRANSPORTATION" }
  );
  await FlowRuleModel.updateMany(
    { isDeleted: { $ne: true }, flowType: "INLAND_LOGISTICS" },
    { flowType: "INLAND_TRANSPORTATION" }
  );
  await FlowRuleModel.updateMany(
    { isDeleted: { $ne: true }, flowType: "LOGISTICS" },
    { flowType: "INLAND_TRANSPORTATION" }
  );
  const defaults = await migrateFromLegacy();
  const defaultFlowTypes = Array.from(new Set(defaults.map((rule: any) => String(rule.flowType).toUpperCase())));

  const existingFlowTypes = await FlowRuleModel.distinct("flowType", { isDeleted: { $ne: true } });
  const existingSet = new Set(existingFlowTypes.map((flowType: any) => String(flowType).toUpperCase()));
  const missingFlowTypes = defaultFlowTypes.filter((flowType) => !existingSet.has(flowType));

  if (!missingFlowTypes.length) {
    await backfillFlowRuleDescriptions();
    return;
  }

  await hardDeleteFlowTypes(missingFlowTypes);
  const missingDefaults = defaults.filter((rule: any) => missingFlowTypes.includes(String(rule.flowType).toUpperCase()));
  if (missingDefaults.length) {
    await FlowRuleModel.insertMany(missingDefaults);
  }
  await backfillFlowRuleDescriptions();
};

export const seedDefaultFlowRules = async (force = false, flowType?: string) => {
  await normalizeFlowTypes();
  await FlowRuleModel.updateMany(
    { isDeleted: { $ne: true }, flowType: "INTERNAL_LOGISTICS" },
    { flowType: "INLAND_TRANSPORTATION" }
  );
  await FlowRuleModel.updateMany(
    { isDeleted: { $ne: true }, flowType: "INLAND_LOGISTICS" },
    { flowType: "INLAND_TRANSPORTATION" }
  );
  await FlowRuleModel.updateMany(
    { isDeleted: { $ne: true }, flowType: "LOGISTICS" },
    { flowType: "INLAND_TRANSPORTATION" }
  );
  if (force) {
    if (flowType) {
      await hardDeleteFlowTypes([String(flowType).toUpperCase()]);
    } else {
      const allDefaults = buildDefaults();
      const allTypes = Array.from(new Set(allDefaults.map((rule: any) => String(rule.flowType))));
      await hardDeleteFlowTypes(allTypes);
    }
  }

  if (flowType) {
    const type = String(flowType).toUpperCase();
    const existing = await FlowRuleModel.countDocuments({ isDeleted: { $ne: true }, flowType: type });
    if (existing > 0) {
      await backfillFlowRuleDescriptions(type);
      return;
    }
    const allDefaults = buildDefaults();
    const scoped = allDefaults.filter((r: any) => String(r.flowType) === type);
    if (scoped.length === 0) {
      throw new Error(`Unknown flowType '${type}' - no default flow rules available.`);
    }
    if (scoped.length) {
      await hardDeleteFlowTypes([type]);
      await FlowRuleModel.insertMany(scoped);
    }
    await backfillFlowRuleDescriptions(type);
    return;
  }

  await ensureDefaultFlowRules();
  await backfillFlowRuleDescriptions();
};
