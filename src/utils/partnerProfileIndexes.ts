type CollectionIndex = { name?: string; key?: Record<string, unknown> };
type IndexCollection = {
  indexes: () => Promise<CollectionIndex[]>;
  dropIndex: (name: string) => Promise<unknown>;
  createIndex: (key: Record<string, 1 | -1>, options: { name: string }) => Promise<unknown>;
};

type DesiredIndex = { name: string; key: Record<string, 1 | -1> };
type RepairDefinition = {
  collection: string;
  parallelGroups: string[][];
  desired: DesiredIndex[];
};

export const PARTNER_PROFILE_INDEX_REPAIRS: RepairDefinition[] = [
  {
    collection: "financialpartnerprofiles",
    parallelGroups: [["published.partnerTypes", "published.offerings.type"]],
    desired: [
      { name: "financial_partner_types", key: { status: 1, "published.partnerTypes": 1 } },
      { name: "financial_offering_types", key: { status: 1, "published.offerings.type": 1 } },
    ],
  },
  {
    collection: "insurancepartnerprofiles",
    parallelGroups: [["published.partnerTypes", "published.products.type"]],
    desired: [
      { name: "insurance_partner_types", key: { status: 1, "published.partnerTypes": 1 } },
      { name: "insurance_product_types", key: { status: 1, "published.products.type": 1 } },
    ],
  },
  {
    collection: "freightproviderprofiles",
    parallelGroups: [
      ["published.modes", "published.services"],
      ["published.originCountries", "published.destinationCountries"],
    ],
    desired: [
      { name: "freight_modes", key: { status: 1, "published.modes": 1 } },
      { name: "freight_services", key: { status: 1, "published.services": 1 } },
      { name: "freight_origin_countries", key: { status: 1, "published.originCountries": 1 } },
      { name: "freight_destination_countries", key: { status: 1, "published.destinationCountries": 1 } },
    ],
  },
];

const sameKey = (left: Record<string, unknown> = {}, right: Record<string, unknown> = {}) => {
  const a = Object.entries(left), b = Object.entries(right);
  return a.length === b.length && a.every(([key, value], index) => b[index]?.[0] === key && b[index]?.[1] === value);
};

export async function repairPartnerProfileCollectionIndexes(collection: IndexCollection, definition: RepairDefinition, apply = false) {
  let indexes: CollectionIndex[] = [];
  try {
    indexes = await collection.indexes();
  } catch (error: any) {
    if (Number(error?.code) !== 26 && !/namespace.*not found/i.test(String(error?.message || ""))) throw error;
  }
  const invalid = indexes.filter((index) => definition.parallelGroups.some((group) => group.every((key) => index.key?.[key] === 1)));
  const missing = definition.desired.filter((desired) => !indexes.some((index) => sameKey(index.key, desired.key)));
  const report = {
    collection: definition.collection,
    mode: apply ? "apply" : "dry-run",
    invalidIndexes: invalid.map((index) => index.name).filter(Boolean) as string[],
    missingIndexes: missing.map((index) => index.name),
    droppedIndexes: [] as string[],
    createdIndexes: [] as string[],
  };
  if (!apply) return report;
  for (const index of invalid) {
    if (!index.name) continue;
    try {
      await collection.dropIndex(index.name);
      report.droppedIndexes.push(index.name);
    } catch (error: any) {
      if (Number(error?.code) !== 27 && !/index.*not found/i.test(String(error?.message || ""))) throw error;
    }
  }
  for (const index of missing) {
    await collection.createIndex(index.key, { name: index.name });
    report.createdIndexes.push(index.name);
  }
  return report;
}

export async function repairPartnerProfileIndexes(connection: { collection: (name: string) => IndexCollection }, apply = false) {
  const reports = [];
  for (const definition of PARTNER_PROFILE_INDEX_REPAIRS) {
    reports.push(await repairPartnerProfileCollectionIndexes(connection.collection(definition.collection), definition, apply));
  }
  return reports;
}
