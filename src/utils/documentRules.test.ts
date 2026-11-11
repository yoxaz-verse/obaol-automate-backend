import { describe, expect, it } from "vitest";
import { DocumentRuleModel } from "../database/models/documentRule";
import { DEFAULT_DOCUMENT_RULES, ensureDefaultDocumentRules } from "./documentRules";

const identityFor = (rule: (typeof DEFAULT_DOCUMENT_RULES)[number]) => ({
  stageType: rule.stageType,
  stageKey: rule.stageKey,
  docType: rule.docType,
  actionType: rule.actionType,
});

describe("default document rule reconciliation", () => {
  it("backfills every missing default in a partially configured database", async () => {
    await DocumentRuleModel.create({
      ...DEFAULT_DOCUMENT_RULES[1],
      isActive: true,
      isDeleted: false,
    });

    await ensureDefaultDocumentRules();

    const activeDefaults = await DocumentRuleModel.find({ isDeleted: { $ne: true } }).lean();
    expect(activeDefaults).toHaveLength(DEFAULT_DOCUMENT_RULES.length);
    expect(activeDefaults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        stageType: "INQUIRY",
        stageKey: "QUOTATION_CREATED",
        docType: "QUOTATION",
        actionType: "CREATE",
      }),
    ]));
  });

  it("preserves customized fields on an existing default identity", async () => {
    const quotationRule = DEFAULT_DOCUMENT_RULES[0];
    await DocumentRuleModel.create({
      ...quotationRule,
      responsibleRole: "OBAOL",
      visibility: "INTERNAL",
      tradeType: "INTERNATIONAL",
      isRequired: false,
      sortOrder: 999,
      isActive: false,
      isDeleted: false,
    });

    await ensureDefaultDocumentRules();

    const stored = await DocumentRuleModel.findOne(identityFor(quotationRule)).lean();
    expect(stored).toMatchObject({
      responsibleRole: "OBAOL",
      visibility: "INTERNAL",
      tradeType: "INTERNATIONAL",
      isRequired: false,
      sortOrder: 999,
      isActive: false,
      isDeleted: false,
    });
  });

  it("restores a soft-deleted default without overwriting its customization", async () => {
    const quotationRule = DEFAULT_DOCUMENT_RULES[0];
    const deleted = await DocumentRuleModel.create({
      ...quotationRule,
      visibility: "SELLER",
      sortOrder: 777,
      isActive: false,
      isDeleted: true,
    });

    await ensureDefaultDocumentRules();

    const restored = await DocumentRuleModel.find(identityFor(quotationRule)).lean();
    expect(restored).toHaveLength(1);
    expect(String(restored[0]._id)).toBe(String(deleted._id));
    expect(restored[0]).toMatchObject({
      visibility: "SELLER",
      sortOrder: 777,
      isActive: false,
      isDeleted: false,
    });
  });

  it("is idempotent and keeps create and upload identities distinct", async () => {
    await ensureDefaultDocumentRules();
    await ensureDefaultDocumentRules();

    const allRules = await DocumentRuleModel.find({}).lean();
    const purchaseOrderRules = allRules.filter((rule) =>
      rule.stageType === "INQUIRY" &&
      rule.stageKey === "PURCHASE_ORDER_CREATED" &&
      rule.docType === "PURCHASE_ORDER"
    );

    expect(allRules).toHaveLength(DEFAULT_DOCUMENT_RULES.length);
    expect(purchaseOrderRules.map((rule) => rule.actionType).sort()).toEqual(["CREATE", "UPLOAD"]);
  });
});
