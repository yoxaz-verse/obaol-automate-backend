export const LAB_PARAMETER_INDEX_KEY = "published.productCapabilityTemplates.parameterIds";
export const LAB_CLASSIFICATION_INDEX_KEY = "published.productCapabilityTemplates.qualityClassifications";

export const LAB_PARAMETER_INDEX_NAME = "published_product_parameters";
export const LAB_CLASSIFICATION_INDEX_NAME = "published_product_classifications";

export const LEGACY_UNIQUE_COMPANY_INDEX_NAME = "companyId_1";
export const LAB_COMPANY_UPDATED_INDEX_NAME = "companyId_1_updatedAt_-1";
export const LAB_COMPANY_STATUS_UPDATED_INDEX_NAME = "companyId_1_status_1_updatedAt_-1";

type CollectionIndex = { name?: string; key?: Record<string, unknown>; unique?: boolean };
type IndexCollection = {
  indexes: () => Promise<CollectionIndex[]>;
  dropIndex: (name: string) => Promise<unknown>;
  createIndex: (key: Record<string, 1 | -1>, options: { name: string }) => Promise<unknown>;
};

const exactIndex = (index: CollectionIndex, key: string) => {
  const entries = Object.entries(index.key || {});
  return entries.length === 1 && entries[0][0] === key && entries[0][1] === 1;
};

export const isParallelArrayIndexError = (error: any) =>
  Number(error?.code) === 171 || /cannot index parallel arrays/i.test(String(error?.message || ""));

export async function repairLabProfileIndexes(collection: IndexCollection, apply = false) {
  const indexes = await collection.indexes();
  const invalidParallelArrayIndexes = indexes.filter((index) => {
    const keys = index.key || {};
    return keys[LAB_PARAMETER_INDEX_KEY] === 1 && keys[LAB_CLASSIFICATION_INDEX_KEY] === 1;
  });
  const legacyUniqueCompanyIndexes = indexes.filter((index) =>
    index.unique === true && exactIndex(index, "companyId"),
  );
  const invalidIndexes = [...invalidParallelArrayIndexes, ...legacyUniqueCompanyIndexes]
    .filter((index, position, rows) => rows.findIndex((row) => row.name === index.name) === position);
  const missingIndexes = [
    ...(!indexes.some((index) => exactIndex(index, LAB_PARAMETER_INDEX_KEY)) ? [LAB_PARAMETER_INDEX_NAME] : []),
    ...(!indexes.some((index) => exactIndex(index, LAB_CLASSIFICATION_INDEX_KEY)) ? [LAB_CLASSIFICATION_INDEX_NAME] : []),
    ...(!indexes.some((index) => index.name === LAB_COMPANY_UPDATED_INDEX_NAME) ? [LAB_COMPANY_UPDATED_INDEX_NAME] : []),
    ...(!indexes.some((index) => index.name === LAB_COMPANY_STATUS_UPDATED_INDEX_NAME) ? [LAB_COMPANY_STATUS_UPDATED_INDEX_NAME] : []),
  ];
  const report = {
    mode: apply ? "apply" : "dry-run",
    invalidIndexes: invalidIndexes.map((index) => index.name).filter(Boolean) as string[],
    missingIndexes,
    droppedIndexes: [] as string[],
    createdIndexes: [] as string[],
  };
  if (!apply) return report;

  for (const index of invalidIndexes) {
    if (!index.name) continue;
    await collection.dropIndex(index.name);
    report.droppedIndexes.push(index.name);
  }
  if (missingIndexes.includes(LAB_PARAMETER_INDEX_NAME)) {
    await collection.createIndex({ [LAB_PARAMETER_INDEX_KEY]: 1 }, { name: LAB_PARAMETER_INDEX_NAME });
    report.createdIndexes.push(LAB_PARAMETER_INDEX_NAME);
  }
  if (missingIndexes.includes(LAB_CLASSIFICATION_INDEX_NAME)) {
    await collection.createIndex({ [LAB_CLASSIFICATION_INDEX_KEY]: 1 }, { name: LAB_CLASSIFICATION_INDEX_NAME });
    report.createdIndexes.push(LAB_CLASSIFICATION_INDEX_NAME);
  }
  if (missingIndexes.includes(LAB_COMPANY_UPDATED_INDEX_NAME)) {
    await collection.createIndex({ companyId: 1, updatedAt: -1 }, { name: LAB_COMPANY_UPDATED_INDEX_NAME });
    report.createdIndexes.push(LAB_COMPANY_UPDATED_INDEX_NAME);
  }
  if (missingIndexes.includes(LAB_COMPANY_STATUS_UPDATED_INDEX_NAME)) {
    await collection.createIndex({ companyId: 1, status: 1, updatedAt: -1 }, { name: LAB_COMPANY_STATUS_UPDATED_INDEX_NAME });
    report.createdIndexes.push(LAB_COMPANY_STATUS_UPDATED_INDEX_NAME);
  }
  return report;
}
