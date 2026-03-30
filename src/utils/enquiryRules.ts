import { EnquiryRuleModel } from "../database/models/enquiryRule";
import { InquiryModel } from "../database/models/enquiry";

const DEFAULT_RULES = [
  {
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

export const ensureDefaultEnquiryRules = async () => {
  await EnquiryRuleModel.updateMany(
    { stageKey: "INQUIRY_CREATED" },
    { stageKey: "ENQUIRY_CREATED", label: "Enquiry Created" }
  );
  await InquiryModel.updateMany(
    { workflowStage: "INQUIRY_CREATED" },
    { workflowStage: "ENQUIRY_CREATED" }
  );
  const existingStages = await EnquiryRuleModel.distinct("stageKey", { isDeleted: { $ne: true } });
  const existingSet = new Set(existingStages.map((stage: any) => String(stage).toUpperCase()));
  const defaultSet = new Set(DEFAULT_RULES.map((rule) => String(rule.stageKey).toUpperCase()));
  const legacyStageKeys = new Set([
    "INQUIRY_CREATED",
    "QUOTE_REQUESTED",
    "QUOTATION_SUBMITTED",
    "QUOTATION_REVISED",
    "PROFORMA_ISSUED",
    "PURCHASE_ORDER_RECEIVED",
    "ORDER_CONFIRMED",
  ]);
  const hasLegacyStages = Array.from(existingSet).some((key) => legacyStageKeys.has(key));
  const stagesMatch =
    existingSet.size === defaultSet.size &&
    Array.from(defaultSet).every((key) => existingSet.has(key));
  if (stagesMatch && existingSet.size > 0 && !hasLegacyStages) return;

  await EnquiryRuleModel.updateMany({ isDeleted: { $ne: true } }, { isDeleted: true });
  await EnquiryRuleModel.insertMany(
    DEFAULT_RULES.map((rule) => ({
      ...rule,
      stageKey: String(rule.stageKey).toUpperCase(),
      label: String(rule.label),
      description: rule.description || "",
      requiredActionMode: (rule as any).requiredActionMode || "ALL",
      isDeleted: false,
    }))
  );
};

export const seedDefaultEnquiryRules = async (force = false) => {
  if (force) {
    await EnquiryRuleModel.updateMany({ isDeleted: { $ne: true } }, { isDeleted: true });
  }
  await ensureDefaultEnquiryRules();
};
