import { EnquiryRuleModel } from "../database/models/enquiryRule";

const DEFAULT_RULES = [
  {
    stageKey: "INQUIRY_CREATED",
    label: "Inquiry Created",
    description: "New enquiry created",
    sortOrder: 10,
    isActive: true,
    requiredActions: ["SUPPLIER_ACCEPTED"],
    triggersOrderCreation: false,
  },
  {
    stageKey: "QUOTATION_SUBMITTED",
    label: "Quotation Submitted",
    description: "Supplier accepted and quotation provided",
    sortOrder: 20,
    isActive: true,
    requiredActions: ["BUYER_CONFIRMED"],
    triggersOrderCreation: false,
  },
  {
    stageKey: "QUOTATION_REVISED",
    label: "Quotation Revised",
    description: "Quotation updated/revised",
    sortOrder: 30,
    isActive: true,
    requiredActions: [],
    triggersOrderCreation: false,
  },
  {
    stageKey: "PROFORMA_ISSUED",
    label: "Proforma Issued",
    description: "Execution responsibilities finalized",
    sortOrder: 40,
    isActive: true,
    requiredActions: ["RESPONSIBILITIES_FINALIZED"],
    triggersOrderCreation: false,
  },
  {
    stageKey: "PURCHASE_ORDER_RECEIVED",
    label: "Purchase Order Received",
    description: "PO received from buyer",
    sortOrder: 50,
    isActive: true,
    requiredActions: [],
    triggersOrderCreation: false,
  },
  {
    stageKey: "ORDER_CONFIRMED",
    label: "Order Confirmed",
    description: "Order confirmed and created",
    sortOrder: 60,
    isActive: true,
    requiredActions: [],
    triggersOrderCreation: true,
  },
];

export const ensureDefaultEnquiryRules = async () => {
  const count = await EnquiryRuleModel.countDocuments({ isDeleted: { $ne: true } });
  if (count > 0) return;

  await EnquiryRuleModel.insertMany(
    DEFAULT_RULES.map((rule) => ({
      ...rule,
      stageKey: String(rule.stageKey).toUpperCase(),
      label: String(rule.label),
      description: rule.description || "",
    }))
  );
};
