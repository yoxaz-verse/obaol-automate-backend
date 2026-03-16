import { DocumentRuleModel } from "../database/models/documentRule";

export const DEFAULT_DOCUMENT_RULES = [
  // Inquiry stages
  { docType: "QUOTATION", stageType: "INQUIRY", stageKey: "QUOTATION_SUBMITTED", responsibleRole: "SELLER", actionType: "CREATE", visibility: "BOTH", tradeType: "BOTH", isRequired: true, sortOrder: 10 },
  { docType: "PROFORMA_INVOICE", stageType: "INQUIRY", stageKey: "PROFORMA_ISSUED", responsibleRole: "SELLER", actionType: "CREATE", visibility: "BOTH", tradeType: "BOTH", isRequired: true, sortOrder: 20 },
  { docType: "PURCHASE_ORDER", stageType: "INQUIRY", stageKey: "PURCHASE_ORDER_RECEIVED", responsibleRole: "BUYER", actionType: "UPLOAD", visibility: "SELLER", tradeType: "BOTH", isRequired: true, sortOrder: 30 },
  { docType: "SALES_CONTRACT", stageType: "ORDER", stageKey: "CONTRACT_SIGNED", responsibleRole: "OBAOL", actionType: "UPLOAD", visibility: "BOTH", tradeType: "BOTH", isRequired: true, sortOrder: 40 },
  // Order stages
  { docType: "PACKING_LIST", stageType: "ORDER", stageKey: "PACKING_COMPLETED", responsibleRole: "PACKAGING", actionType: "UPLOAD", visibility: "BOTH", tradeType: "BOTH", isRequired: true, sortOrder: 50 },
  { docType: "INSPECTION_CERTIFICATE", stageType: "ORDER", stageKey: "QUALITY_VERIFIED", responsibleRole: "QUALITY", actionType: "UPLOAD", visibility: "BOTH", tradeType: "BOTH", isRequired: true, sortOrder: 60 },
  { docType: "PHYTOSANITARY_CERTIFICATE", stageType: "ORDER", stageKey: "COMPLIANCE_APPROVED", responsibleRole: "OBAOL", actionType: "UPLOAD", visibility: "BOTH", tradeType: "INTERNATIONAL", isRequired: true, sortOrder: 70 },
  { docType: "FUMIGATION_CERTIFICATE", stageType: "ORDER", stageKey: "COMPLIANCE_APPROVED", responsibleRole: "OBAOL", actionType: "UPLOAD", visibility: "BOTH", tradeType: "INTERNATIONAL", isRequired: false, sortOrder: 71 },
  { docType: "BILL_OF_LADING", stageType: "ORDER", stageKey: "SHIPPED", responsibleRole: "SHIPPING", actionType: "UPLOAD", visibility: "BOTH", tradeType: "BOTH", isRequired: true, sortOrder: 80 },
  { docType: "AIR_WAYBILL", stageType: "ORDER", stageKey: "SHIPPED", responsibleRole: "SHIPPING", actionType: "UPLOAD", visibility: "BOTH", tradeType: "BOTH", isRequired: false, sortOrder: 81 },
  { docType: "INSURANCE_CERTIFICATE", stageType: "ORDER", stageKey: "SHIPPED", responsibleRole: "OBAOL", actionType: "UPLOAD", visibility: "BOTH", tradeType: "INTERNATIONAL", isRequired: true, sortOrder: 82 },
  { docType: "INVOICE", stageType: "ORDER", stageKey: "PAYMENT_PENDING", responsibleRole: "SELLER", actionType: "CREATE", visibility: "BOTH", tradeType: "BOTH", isRequired: true, sortOrder: 90 },
  { docType: "PAYMENT_ADVICE", stageType: "ORDER", stageKey: "PAYMENT_COMPLETED", responsibleRole: "BUYER", actionType: "UPLOAD", visibility: "SELLER", tradeType: "BOTH", isRequired: true, sortOrder: 100 },
];

export const ensureDefaultDocumentRules = async () => {
  const count = await DocumentRuleModel.countDocuments({ isDeleted: { $ne: true } });
  if (count > 0) return;
  await DocumentRuleModel.insertMany(DEFAULT_DOCUMENT_RULES.map((rule) => ({
    ...rule,
    isActive: true,
    isDeleted: false,
  })));
};

export const seedDefaultDocumentRules = async (force = false) => {
  if (force) {
    await DocumentRuleModel.updateMany({ isDeleted: { $ne: true } }, { isDeleted: true });
  }
  await ensureDefaultDocumentRules();
};
