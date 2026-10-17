import { canonicalizeGovernanceMappings } from "./sidebarGovernanceRegistry";

type Snapshot = { revision?: number; mappings?: any[]; updatedAt?: Date; updatedBy?: any };

const plainMappings = (mappings: any[] = []) => mappings.map((row: any) => ({
  functionSlug: String(row.functionSlug),
  routePath: String(row.routePath),
  placement: String(row.placement),
  status: String(row.status),
  order: Number(row.order),
}));

export const migrateCommonRoutesFromSnapshot = (snapshot: Snapshot, now = new Date()) => {
  const before = plainMappings(snapshot.mappings || []);
  const mappings = canonicalizeGovernanceMappings(before);
  const changed = JSON.stringify(before) !== JSON.stringify(mappings);
  return {
    changed,
    snapshot: changed ? {
      revision: Number(snapshot.revision || 0) + 1,
      mappings,
      updatedAt: now,
      updatedBy: snapshot.updatedBy,
    } : snapshot,
  };
};
