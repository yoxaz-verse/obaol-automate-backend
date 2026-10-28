import { DocumentConversionRuleModel } from "../database/models/documentConversionRule";

export const ensureDefaultDocumentConversionRules = async () => {
  await DocumentConversionRuleModel.updateOne(
    { seedKey: "accepted-quotation-to-order" },
    { $setOnInsert: {
      seedKey: "accepted-quotation-to-order",
      name: "Create order from accepted quotation",
      sourceType: "QUOTATION",
      sourceStatuses: ["ACCEPTED"],
      targetKind: "ORDER",
      targetDocumentType: null,
      tradeType: "BOTH",
      requiresConfirmation: true,
      displayOrder: 10,
      isActive: true,
      isDeleted: false,
    } },
    { upsert: true }
  );
};

