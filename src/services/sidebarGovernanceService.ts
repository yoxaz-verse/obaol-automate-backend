import { CompanyFunctionModel } from "../database/models/companyFunction";
import { SidebarGovernanceModel } from "../database/models/sidebarGovernance";
import { canonicalizeCompanyFunctionTaxonomySlug } from "../utils/companyCapabilities";
import {
  ASSOCIATE_SIDEBAR_ROUTES,
  SIDEBAR_PLACEMENTS,
  SIDEBAR_RESOLVED_SECTIONS,
  SIDEBAR_ROUTE_PATHS,
  SIDEBAR_STATUSES,
  canonicalizeGovernanceMappings,
  createBaselineSidebarMappings,
  createDefaultSidebarSectionOrder,
  deriveSidebarSectionOrder,
  migrateUnassignedFallbacks,
  normalizeBiddingForSeller,
} from "../utils/sidebarGovernanceRegistry";

export const getCanonicalSidebarFunctions = async () => {
  const rows = await CompanyFunctionModel.find({ isActive: true }).select("_id name slug orderIndex").sort({ orderIndex: 1, name: 1 }).lean();
  const bySlug = new Map<string, any>();
  for (const row of rows as any[]) {
    const rawSlug = String(row.slug || "").trim().toLowerCase();
    const slug = canonicalizeCompanyFunctionTaxonomySlug(rawSlug);
    const current = bySlug.get(slug);
    if (!current || (rawSlug === slug && String(current.slug) !== slug)) {
      bySlug.set(slug, { ...row, slug, name: slug === "buyer" ? "Buyer" : slug === "seller" ? "Seller" : row.name });
    }
  }
  return Array.from(bySlug.values());
};

const getFunctionSlugs = async () => (await getCanonicalSidebarFunctions()).map((row: any) => String(row.slug));

export const normalizeSidebarSectionOrder = (value: any, mappings: any[]) => {
  const routeCount = ASSOCIATE_SIDEBAR_ROUTES.length;
  return SIDEBAR_RESOLVED_SECTIONS.every((section) => Array.isArray(value?.[section]) && value[section].length === routeCount)
    ? value
    : deriveSidebarSectionOrder(mappings);
};

const normalizeFallbackStatuses = (value: any) => value instanceof Map ? Object.fromEntries(value.entries()) : (value || {});
const deriveFallbackStatuses = (mappings: any[]) => Object.fromEntries(ASSOCIATE_SIDEBAR_ROUTES.map(([, routePath]) => [routePath,
  (["LIVE", "COMING_SOON", "HIDDEN"] as const).find((status) => mappings.some((row) => row.routePath === routePath && row.placement === "OTHER_SERVICES" && row.status === status)) || "HIDDEN",
]));

export const normalizeSidebarConfig = (config: any) => {
  const value = config?.toObject ? config.toObject() : config;
  const normalizeSnapshot = (snapshot: any) => ({
    ...snapshot,
    resolutionVersion: Number(snapshot?.resolutionVersion || 1),
    sectionOrder: normalizeSidebarSectionOrder(snapshot?.sectionOrder, snapshot?.mappings || []),
    fallbackStatusByRoute: normalizeFallbackStatuses(snapshot?.fallbackStatusByRoute),
    mappings: canonicalizeGovernanceMappings(snapshot?.mappings || []),
  });
  return { ...value, draft: normalizeSnapshot(value.draft), published: normalizeSnapshot(value.published) };
};

export const ensureAdminSidebarConfig = async () => {
  const existing = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" });
  if (existing) {
    const baseline = createBaselineSidebarMappings(await getFunctionSlugs());
    const currentDraft = canonicalizeGovernanceMappings((existing as any).draft?.mappings || []);
    const keys = new Set(currentDraft.map((row: any) => `${row.functionSlug}:${row.routePath}`));
    const completedDraft = [...currentDraft, ...baseline.filter((row) => !keys.has(`${row.functionSlug}:${row.routePath}`))];
    const migrationVersion = Number((existing as any).matrixMigrationVersion || 0);
    const biddingDraft = migrationVersion < 3 ? normalizeBiddingForSeller(completedDraft) : completedDraft;
    const draft = migrationVersion < 4 ? migrateUnassignedFallbacks(biddingDraft) : biddingDraft;
    const needsV2 = Number((existing as any).draft?.resolutionVersion || 1) !== 2;
    const changed = JSON.stringify(draft) !== JSON.stringify(currentDraft) || needsV2 || migrationVersion < 4;
    if (changed) {
      (existing as any).draft.mappings = draft;
      (existing as any).draft.resolutionVersion = 2;
      (existing as any).draft.sectionOrder = deriveSidebarSectionOrder(draft);
      (existing as any).draft.fallbackStatusByRoute = deriveFallbackStatuses(draft);
      (existing as any).draft.revision = Number((existing as any).draft.revision || 0) + 1;
      (existing as any).draft.updatedAt = new Date();
      (existing as any).matrixMigrationVersion = 4;
      await existing.save();
    }
    return existing;
  }

  const mappings = createBaselineSidebarMappings(await getFunctionSlugs());
  return SidebarGovernanceModel.create({
    key: "associate-sidebar",
    matrixMigrationVersion: 4,
    draft: { revision: 1, resolutionVersion: 2, sectionOrder: createDefaultSidebarSectionOrder(), fallbackStatusByRoute: deriveFallbackStatuses(mappings), mappings, updatedAt: new Date() },
    published: { revision: 1, resolutionVersion: 2, sectionOrder: createDefaultSidebarSectionOrder(), fallbackStatusByRoute: deriveFallbackStatuses(mappings), mappings, updatedAt: new Date() },
  });
};

export const getPublishedSidebarConfig = async () => {
  const current = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).select("published").lean();
  if (current) return current;
  const mappings = createBaselineSidebarMappings(await getFunctionSlugs());
  return {
    published: {
      revision: 0,
      resolutionVersion: 2,
      sectionOrder: createDefaultSidebarSectionOrder(),
      fallbackStatusByRoute: deriveFallbackStatuses(mappings),
      mappings,
    },
  };
};

export const validateSidebarSectionOrder = (input: any) => {
  const expected = ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path);
  const expectedSet = new Set(expected);
  const result: Record<string, string[]> = {};
  for (const section of SIDEBAR_RESOLVED_SECTIONS) {
    const rows = input?.[section];
    if (!Array.isArray(rows)) throw new Error(`Section order ${section} must be an array.`);
    if (rows.length !== expected.length || new Set(rows).size !== rows.length || rows.some((path: string) => !expectedSet.has(path as any))) {
      throw new Error(`Section order ${section} must contain every registered route exactly once.`);
    }
    result[section] = rows.map(String);
  }
  return result;
};

export const validateSidebarFallbackStatuses = (input: any) => Object.fromEntries(ASSOCIATE_SIDEBAR_ROUTES.map(([, routePath]) => {
  const status = String(input?.[routePath] || "").toUpperCase();
  if (!(SIDEBAR_STATUSES as readonly string[]).includes(status)) throw new Error(`Fallback status is required for ${routePath}.`);
  return [routePath, status];
}));

export const validateSidebarMappings = async (input: any[], requireComplete = false) => {
  if (!Array.isArray(input)) throw new Error("Mappings must be an array.");
  const functionSlugs = new Set(await getFunctionSlugs());
  const seen = new Set<string>();
  const normalized = input.map((row, index) => {
    const functionSlug = String(row?.functionSlug || "").trim().toLowerCase();
    const routePath = String(row?.routePath || "").trim();
    const placement = String(row?.placement || "").toUpperCase();
    const status = String(row?.status || "").toUpperCase();
    const order = Number(row?.order);
    if (canonicalizeCompanyFunctionTaxonomySlug(functionSlug) !== functionSlug) throw new Error(`Legacy company function is not allowed: ${functionSlug}.`);
    if (!functionSlugs.has(functionSlug)) throw new Error(`Unknown or inactive company function: ${functionSlug || index}.`);
    if (!SIDEBAR_ROUTE_PATHS.has(routePath as any)) throw new Error(`Unknown dashboard route: ${routePath || index}.`);
    if (!(SIDEBAR_PLACEMENTS as readonly string[]).includes(placement)) throw new Error(`Invalid placement at row ${index + 1}.`);
    if (!(SIDEBAR_STATUSES as readonly string[]).includes(status)) throw new Error(`Invalid status at row ${index + 1}.`);
    if (placement === "UNASSIGNED" && status !== "HIDDEN") throw new Error(`Unassigned mapping must be Hidden at row ${index + 1}.`);
    if (!Number.isInteger(order) || order < 0) throw new Error(`Invalid order at row ${index + 1}.`);
    const key = `${functionSlug}:${routePath}`;
    if (seen.has(key)) throw new Error(`Duplicate mapping for ${functionSlug} and ${routePath}.`);
    seen.add(key);
    return { functionSlug, routePath, placement, status, order };
  });
  if (requireComplete) {
    for (const functionSlug of functionSlugs) for (const routePath of SIDEBAR_ROUTE_PATHS) {
      if (!seen.has(`${functionSlug}:${routePath}`)) throw new Error(`Missing mapping for ${functionSlug} and ${routePath}.`);
    }
  }
  return normalized;
};

export const parseExpectedSidebarRevision = (value: unknown, field: string) => {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 0) {
    const error: any = new Error(`${field} is required and must be a non-negative integer.`);
    error.status = 400;
    error.code = "INVALID_EXPECTED_REVISION";
    throw error;
  }
  return revision;
};

export const sidebarRevisionConflict = async (expected: number, snapshot: "draft" | "published") => {
  const current: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).select(`${snapshot}.revision`).lean();
  const actual = Number(current?.[snapshot]?.revision || 0);
  const error: any = new Error(`Sidebar governance ${snapshot} changed from revision ${expected} to ${actual}. Reload before continuing.`);
  error.status = 409;
  error.code = "SIDEBAR_GOVERNANCE_REVISION_CONFLICT";
  error.details = { snapshot, expectedRevision: expected, currentRevision: actual };
  throw error;
};
