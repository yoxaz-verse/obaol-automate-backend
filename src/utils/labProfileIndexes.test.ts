import { describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { LabProfileModel } from "../database/models/labProfile";
import {
  LAB_CLASSIFICATION_INDEX_KEY,
  LAB_CLASSIFICATION_INDEX_NAME,
  LAB_PARAMETER_INDEX_KEY,
  LAB_PARAMETER_INDEX_NAME,
  LAB_COMPANY_STATUS_UPDATED_INDEX_NAME,
  LAB_COMPANY_UPDATED_INDEX_NAME,
  LAB_PUBLIC_SEARCH_FIELDS,
  LAB_PUBLIC_SEARCH_INDEX_NAME,
  isParallelArrayIndexError,
  repairLabProfileIndexes,
} from "./labProfileIndexes";

const invalidIndex = {
  name: "published.productCapabilityTemplates.parameterIds_1_published.productCapabilityTemplates.qualityClassifications_1",
  key: { [LAB_PARAMETER_INDEX_KEY]: 1, [LAB_CLASSIFICATION_INDEX_KEY]: 1 },
};
const desiredCompanyIndexes = [
  { name: LAB_COMPANY_UPDATED_INDEX_NAME, key: { companyId: 1, updatedAt: -1 } },
  { name: LAB_COMPANY_STATUS_UPDATED_INDEX_NAME, key: { companyId: 1, status: 1, updatedAt: -1 } },
];
const desiredPublicSearchIndex = { name: LAB_PUBLIC_SEARCH_INDEX_NAME, key: { _fts: "text", _ftsx: 1 }, weights: Object.fromEntries(LAB_PUBLIC_SEARCH_FIELDS.map((field) => [field, 1])) };

describe("lab profile search indexes", () => {
  it("declares separate indexes for parameter and classification arrays", () => {
    const indexes = LabProfileModel.schema.indexes().map(([keys]) => keys);
    expect(indexes).toContainEqual({ [LAB_PARAMETER_INDEX_KEY]: 1 });
    expect(indexes).toContainEqual({ [LAB_CLASSIFICATION_INDEX_KEY]: 1 });
    expect(indexes).not.toContainEqual(invalidIndex.key);
    expect(indexes).toContainEqual(Object.fromEntries(LAB_PUBLIC_SEARCH_FIELDS.map((field) => [field, "text"])));
  });

  it("stores a published profile containing both classifications and parameters", async () => {
    await LabProfileModel.createIndexes();
    const templateId = new Types.ObjectId();
    const snapshot = {
      displayName: "Indexed Lab",
      contactEmail: "indexed@example.com",
      contactPhone: "+91 99999 99999",
      address: "Test address",
      physicalCountryId: new Types.ObjectId(),
      credentials: [],
      productCapabilityTemplates: [{
        _id: templateId,
        commodityId: new Types.ObjectId(),
        qualityClassifications: ["ORGANIC"],
        testIds: [new Types.ObjectId()],
        parameterIds: [new Types.ObjectId()],
        credentialIds: [],
      }],
      countryAssignments: [{ countryId: new Types.ObjectId(), productTemplateIds: [templateId] }],
    };
    const profile = await LabProfileModel.create({ companyId: new Types.ObjectId(), draft: snapshot, published: snapshot, status: "PUBLISHED" });
    expect(profile.status).toBe("PUBLISHED");
  });

  it("reports the repair without changing indexes in dry-run mode", async () => {
    const collection = { indexes: vi.fn().mockResolvedValue([invalidIndex, ...desiredCompanyIndexes, desiredPublicSearchIndex]), dropIndex: vi.fn(), createIndex: vi.fn() };
    const report = await repairLabProfileIndexes(collection, false);
    expect(report).toMatchObject({ mode: "dry-run", invalidIndexes: [invalidIndex.name], missingIndexes: [LAB_PARAMETER_INDEX_NAME, LAB_CLASSIFICATION_INDEX_NAME] });
    expect(collection.dropIndex).not.toHaveBeenCalled();
    expect(collection.createIndex).not.toHaveBeenCalled();
  });

  it("drops the invalid index and creates idempotent replacements", async () => {
    const collection = { indexes: vi.fn().mockResolvedValue([invalidIndex, ...desiredCompanyIndexes, desiredPublicSearchIndex]), dropIndex: vi.fn(), createIndex: vi.fn() };
    const report = await repairLabProfileIndexes(collection, true);
    expect(collection.dropIndex).toHaveBeenCalledWith(invalidIndex.name);
    expect(collection.createIndex).toHaveBeenCalledTimes(2);
    expect(report.createdIndexes).toEqual([LAB_PARAMETER_INDEX_NAME, LAB_CLASSIFICATION_INDEX_NAME]);

    const repaired = {
      indexes: vi.fn().mockResolvedValue([
        { name: LAB_PARAMETER_INDEX_NAME, key: { [LAB_PARAMETER_INDEX_KEY]: 1 } },
        { name: LAB_CLASSIFICATION_INDEX_NAME, key: { [LAB_CLASSIFICATION_INDEX_KEY]: 1 } },
        ...desiredCompanyIndexes,
        desiredPublicSearchIndex,
      ]),
      dropIndex: vi.fn(),
      createIndex: vi.fn(),
    };
    const rerun = await repairLabProfileIndexes(repaired, true);
    expect(rerun).toMatchObject({ invalidIndexes: [], missingIndexes: [], droppedIndexes: [], createdIndexes: [] });
    expect(repaired.dropIndex).not.toHaveBeenCalled();
    expect(repaired.createIndex).not.toHaveBeenCalled();
  });

  it("removes the legacy unique company index and creates non-unique company indexes", async () => {
    const legacy = { name: "companyId_1", key: { companyId: 1 }, unique: true };
    const collection = { indexes: vi.fn().mockResolvedValue([legacy, { name: LAB_PARAMETER_INDEX_NAME, key: { [LAB_PARAMETER_INDEX_KEY]: 1 } }, { name: LAB_CLASSIFICATION_INDEX_NAME, key: { [LAB_CLASSIFICATION_INDEX_KEY]: 1 } }, desiredPublicSearchIndex]), dropIndex: vi.fn(), createIndex: vi.fn() };
    const report = await repairLabProfileIndexes(collection, true);
    expect(collection.dropIndex).toHaveBeenCalledWith("companyId_1");
    expect(collection.createIndex).toHaveBeenCalledWith({ companyId: 1, updatedAt: -1 }, { name: LAB_COMPANY_UPDATED_INDEX_NAME });
    expect(collection.createIndex).toHaveBeenCalledWith({ companyId: 1, status: 1, updatedAt: -1 }, { name: LAB_COMPANY_STATUS_UPDATED_INDEX_NAME });
    expect(report.invalidIndexes).toContain("companyId_1");
  });

  it("replaces a stale text index so public descriptions are searchable", async () => {
    const stale = { name: "published.displayName_text", key: { _fts: "text", _ftsx: 1 }, weights: { "published.displayName": 1, "published.address": 1, "published.city": 1, "published.state": 1 } };
    const collection = { indexes: vi.fn().mockResolvedValue([stale, ...desiredCompanyIndexes, { name: LAB_PARAMETER_INDEX_NAME, key: { [LAB_PARAMETER_INDEX_KEY]: 1 } }, { name: LAB_CLASSIFICATION_INDEX_NAME, key: { [LAB_CLASSIFICATION_INDEX_KEY]: 1 } }]), dropIndex: vi.fn(), createIndex: vi.fn() };
    const report = await repairLabProfileIndexes(collection, true);
    expect(collection.dropIndex).toHaveBeenCalledWith(stale.name);
    expect(collection.createIndex).toHaveBeenCalledWith(Object.fromEntries(LAB_PUBLIC_SEARCH_FIELDS.map((field) => [field, "text"])), { name: LAB_PUBLIC_SEARCH_INDEX_NAME });
    expect(report.createdIndexes).toContain(LAB_PUBLIC_SEARCH_INDEX_NAME);
  });

  it("recognizes MongoDB parallel-array failures without matching unrelated errors", () => {
    expect(isParallelArrayIndexError({ code: 171 })).toBe(true);
    expect(isParallelArrayIndexError({ message: "cannot index parallel arrays [a] [b]" })).toBe(true);
    expect(isParallelArrayIndexError(new Error("network timeout"))).toBe(false);
  });
});
