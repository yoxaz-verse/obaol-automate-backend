import { describe, expect, it, vi } from "vitest";
import { FinancialPartnerProfileModel } from "../database/models/financialPartner";
import { InsurancePartnerProfileModel } from "../database/models/insurancePartner";
import { FreightProviderProfileModel } from "../database/models/freightForwarding";
import { PARTNER_PROFILE_INDEX_REPAIRS, repairPartnerProfileCollectionIndexes } from "./partnerProfileIndexes";

describe("partner profile indexes", () => {
  it("declares only one array field per compound search index", () => {
    const declared = [
      ...FinancialPartnerProfileModel.schema.indexes(),
      ...InsurancePartnerProfileModel.schema.indexes(),
      ...FreightProviderProfileModel.schema.indexes(),
    ].map(([key]) => key);
    const invalidGroups = PARTNER_PROFILE_INDEX_REPAIRS.flatMap((definition) => definition.parallelGroups);
    expect(declared.some((key) => invalidGroups.some((group) => group.every((field) => key[field] === 1)))).toBe(false);
  });

  it("drops the financial parallel-array index and creates safe replacements", async () => {
    const definition = PARTNER_PROFILE_INDEX_REPAIRS[0];
    const invalid = {
      name: "status_1_published.partnerTypes_1_published.offerings.type_1",
      key: { status: 1, "published.partnerTypes": 1, "published.offerings.type": 1 },
    };
    const collection = { indexes: vi.fn().mockResolvedValue([invalid]), dropIndex: vi.fn(), createIndex: vi.fn() };
    const report = await repairPartnerProfileCollectionIndexes(collection, definition, true);
    expect(collection.dropIndex).toHaveBeenCalledWith(invalid.name);
    expect(collection.createIndex).toHaveBeenCalledTimes(2);
    expect(report.createdIndexes).toEqual(["financial_partner_types", "financial_offering_types"]);
  });

  it("is idempotent when the replacement indexes already exist", async () => {
    const definition = PARTNER_PROFILE_INDEX_REPAIRS[0];
    const collection = {
      indexes: vi.fn().mockResolvedValue(definition.desired.map((index) => ({ name: index.name, key: index.key }))),
      dropIndex: vi.fn(),
      createIndex: vi.fn(),
    };
    const report = await repairPartnerProfileCollectionIndexes(collection, definition, true);
    expect(report).toMatchObject({ invalidIndexes: [], missingIndexes: [], droppedIndexes: [], createdIndexes: [] });
  });

  it("creates indexes for a collection that does not exist yet", async () => {
    const definition = PARTNER_PROFILE_INDEX_REPAIRS[1];
    const collection = { indexes: vi.fn().mockRejectedValue({ code: 26, message: "Namespace not found" }), dropIndex: vi.fn(), createIndex: vi.fn() };
    const report = await repairPartnerProfileCollectionIndexes(collection, definition, true);
    expect(collection.createIndex).toHaveBeenCalledTimes(definition.desired.length);
    expect(report.createdIndexes).toEqual(definition.desired.map((index) => index.name));
  });

  it("tolerates another backend instance dropping the invalid index first", async () => {
    const definition = PARTNER_PROFILE_INDEX_REPAIRS[0];
    const invalid = { name: "bad_parallel_index", key: { "published.partnerTypes": 1, "published.offerings.type": 1 } };
    const collection = { indexes: vi.fn().mockResolvedValue([invalid]), dropIndex: vi.fn().mockRejectedValue({ code: 27, message: "index not found" }), createIndex: vi.fn() };
    const report = await repairPartnerProfileCollectionIndexes(collection, definition, true);
    expect(report.droppedIndexes).toEqual([]);
    expect(collection.createIndex).toHaveBeenCalledTimes(2);
  });
});
