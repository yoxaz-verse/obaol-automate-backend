type CollectionIndex = {
  name?: string;
  key?: Record<string, unknown>;
  unique?: boolean;
  partialFilterExpression?: Record<string, unknown>;
};

type IndexCollection = {
  indexes: () => Promise<CollectionIndex[]>;
  dropIndex: (name: string) => Promise<unknown>;
};

const isLegacySingleOpenConversationIndex = (index: CollectionIndex) => {
  const keys = Object.entries(index.key || {});
  return index.unique === true
    && keys.length === 1
    && keys[0]?.[0] === "requesterId"
    && keys[0]?.[1] === 1
    && index.partialFilterExpression?.isOpen === true;
};

export async function repairSupportConversationIndexes(collection: IndexCollection, apply = false) {
  let indexes: CollectionIndex[] = [];
  try {
    indexes = await collection.indexes();
  } catch (error: any) {
    if (Number(error?.code) !== 26 && !/namespace.*not found/i.test(String(error?.message || ""))) throw error;
  }

  const legacyIndexes = indexes.filter(isLegacySingleOpenConversationIndex);
  const report = {
    collection: "supportconversations",
    mode: apply ? "apply" : "dry-run",
    legacyIndexes: legacyIndexes.map((index) => index.name).filter(Boolean) as string[],
    droppedIndexes: [] as string[],
  };
  if (!apply) return report;

  for (const index of legacyIndexes) {
    if (!index.name) continue;
    try {
      await collection.dropIndex(index.name);
      report.droppedIndexes.push(index.name);
    } catch (error: any) {
      if (Number(error?.code) !== 27 && !/index.*not found/i.test(String(error?.message || ""))) throw error;
    }
  }
  return report;
}
