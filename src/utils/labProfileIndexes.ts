export const LAB_PARAMETER_INDEX_KEY = "published.productCapabilityTemplates.parameterIds";
export const LAB_CLASSIFICATION_INDEX_KEY = "published.productCapabilityTemplates.qualityClassifications";

export const LAB_PARAMETER_INDEX_NAME = "published_product_parameters";
export const LAB_CLASSIFICATION_INDEX_NAME = "published_product_classifications";

export const LEGACY_UNIQUE_COMPANY_INDEX_NAME = "companyId_1";
export const LAB_COMPANY_UPDATED_INDEX_NAME = "companyId_1_updatedAt_-1";
export const LAB_COMPANY_STATUS_UPDATED_INDEX_NAME = "companyId_1_status_1_updatedAt_-1";
export const LAB_PUBLIC_SEARCH_INDEX_NAME = "published_lab_public_search";
export const LAB_PUBLIC_SEARCH_FIELDS = ["published.displayName", "published.summary", "published.address", "published.city", "published.state"] as const;

type CollectionIndex = { name?: string; key?: Record<string, unknown>; unique?: boolean; weights?: Record<string, number> };
type IndexCollection = {
  indexes: () => Promise<CollectionIndex[]>;
  dropIndex: (name: string) => Promise<unknown>;
  createIndex: (key: Record<string, 1 | -1 | "text">, options: { name: string }) => Promise<unknown>;
};

const exactIndex = (index: CollectionIndex, key: string) => {
  const entries = Object.entries(index.key || {});
  return entries.length === 1 && entries[0][0] === key && entries[0][1] === 1;
};

export const isParallelArrayIndexError = (error: any) =>
  Number(error?.code) === 171 || /cannot index parallel arrays/i.test(String(error?.message || ""));

const isTextIndex = (index: CollectionIndex) => Boolean(index.weights && Object.keys(index.weights).length);
const isCurrentPublicSearchIndex = (index: CollectionIndex) =>
  isTextIndex(index) && LAB_PUBLIC_SEARCH_FIELDS.every((field) => index.weights?.[field] === 1);

export async function repairLabProfileIndexes(collection: IndexCollection, apply = false) {
  const indexes = await collection.indexes();
  const invalidParallelArrayIndexes = indexes.filter((index) => {
    const keys = index.key || {};
    return keys[LAB_PARAMETER_INDEX_KEY] === 1 && keys[LAB_CLASSIFICATION_INDEX_KEY] === 1;
  });
  const legacyUniqueCompanyIndexes = indexes.filter((index) =>
    index.unique === true && exactIndex(index, "companyId"),
  );
  const stalePublicSearchIndexes = indexes.filter((index) => isTextIndex(index) && !isCurrentPublicSearchIndex(index));
  const invalidIndexes = [...invalidParallelArrayIndexes, ...legacyUniqueCompanyIndexes, ...stalePublicSearchIndexes]
    .filter((index, position, rows) => rows.findIndex((row) => row.name === index.name) === position);
  const missingIndexes = [
    ...(!indexes.some((index) => exactIndex(index, LAB_PARAMETER_INDEX_KEY)) ? [LAB_PARAMETER_INDEX_NAME] : []),
    ...(!indexes.some((index) => exactIndex(index, LAB_CLASSIFICATION_INDEX_KEY)) ? [LAB_CLASSIFICATION_INDEX_NAME] : []),
    ...(!indexes.some((index) => index.name === LAB_COMPANY_UPDATED_INDEX_NAME) ? [LAB_COMPANY_UPDATED_INDEX_NAME] : []),
    ...(!indexes.some((index) => index.name === LAB_COMPANY_STATUS_UPDATED_INDEX_NAME) ? [LAB_COMPANY_STATUS_UPDATED_INDEX_NAME] : []),
    ...(!indexes.some(isCurrentPublicSearchIndex) ? [LAB_PUBLIC_SEARCH_INDEX_NAME] : []),
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
  if (missingIndexes.includes(LAB_PUBLIC_SEARCH_INDEX_NAME)) {
    await collection.createIndex(Object.fromEntries(LAB_PUBLIC_SEARCH_FIELDS.map((field) => [field, "text"])), { name: LAB_PUBLIC_SEARCH_INDEX_NAME });
    report.createdIndexes.push(LAB_PUBLIC_SEARCH_INDEX_NAME);
  }
  return report;
}
