import { describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { LabProfileModel } from "../database/models/labProfile";
import {
  LAB_CLASSIFICATION_INDEX_KEY,
  LAB_CLASSIFICATION_INDEX_NAME,
  LAB_PARAMETER_INDEX_KEY,
  LAB_PARAMETER_INDEX_NAME,
  isParallelArrayIndexError,
  repairLabProfileIndexes,
} from "./labProfileIndexes";

const invalidIndex = {
  name: "published.productCapabilityTemplates.parameterIds_1_published.productCapabilityTemplates.qualityClassifications_1",
  key: { [LAB_PARAMETER_INDEX_KEY]: 1, [LAB_CLASSIFICATION_INDEX_KEY]: 1 },
};

describe("lab profile search indexes", () => {
  it("declares separate indexes for parameter and classification arrays", () => {
    const indexes = LabProfileModel.schema.indexes().map(([keys]) => keys);
    expect(indexes).toContainEqual({ [LAB_PARAMETER_INDEX_KEY]: 1 });
    expect(indexes).toContainEqual({ [LAB_CLASSIFICATION_INDEX_KEY]: 1 });
    expect(indexes).not.toContainEqual(invalidIndex.key);
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
    const collection = { indexes: vi.fn().mockResolvedValue([invalidIndex]), dropIndex: vi.fn(), createIndex: vi.fn() };
    const report = await repairLabProfileIndexes(collection, false);
    expect(report).toMatchObject({ mode: "dry-run", invalidIndexes: [invalidIndex.name], missingIndexes: [LAB_PARAMETER_INDEX_NAME, LAB_CLASSIFICATION_INDEX_NAME] });
    expect(collection.dropIndex).not.toHaveBeenCalled();
    expect(collection.createIndex).not.toHaveBeenCalled();
  });

  it("drops the invalid index and creates idempotent replacements", async () => {
    const collection = { indexes: vi.fn().mockResolvedValue([invalidIndex]), dropIndex: vi.fn(), createIndex: vi.fn() };
    const report = await repairLabProfileIndexes(collection, true);
    expect(collection.dropIndex).toHaveBeenCalledWith(invalidIndex.name);
    expect(collection.createIndex).toHaveBeenCalledTimes(2);
    expect(report.createdIndexes).toEqual([LAB_PARAMETER_INDEX_NAME, LAB_CLASSIFICATION_INDEX_NAME]);

    const repaired = {
      indexes: vi.fn().mockResolvedValue([
        { name: LAB_PARAMETER_INDEX_NAME, key: { [LAB_PARAMETER_INDEX_KEY]: 1 } },
        { name: LAB_CLASSIFICATION_INDEX_NAME, key: { [LAB_CLASSIFICATION_INDEX_KEY]: 1 } },
      ]),
      dropIndex: vi.fn(),
      createIndex: vi.fn(),
    };
    const rerun = await repairLabProfileIndexes(repaired, true);
    expect(rerun).toMatchObject({ invalidIndexes: [], missingIndexes: [], droppedIndexes: [], createdIndexes: [] });
    expect(repaired.dropIndex).not.toHaveBeenCalled();
    expect(repaired.createIndex).not.toHaveBeenCalled();
  });

  it("recognizes MongoDB parallel-array failures without matching unrelated errors", () => {
    expect(isParallelArrayIndexError({ code: 171 })).toBe(true);
    expect(isParallelArrayIndexError({ message: "cannot index parallel arrays [a] [b]" })).toBe(true);
    expect(isParallelArrayIndexError(new Error("network timeout"))).toBe(false);
  });
});
