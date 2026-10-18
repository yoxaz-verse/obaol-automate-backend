import { Request, Response } from "express";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { SidebarGovernanceModel } from "../database/models/sidebarGovernance";
import { ASSOCIATE_SIDEBAR_ROUTES, COMMON_ASSOCIATE_SIDEBAR_ROUTES, SIDEBAR_PLACEMENTS, SIDEBAR_RESOLVED_SECTIONS, SIDEBAR_ROUTE_PATHS, SIDEBAR_STATUSES, canonicalizeGovernanceMappings, createBaselineSidebarMappings, createDefaultSidebarSectionOrder, deriveSidebarSectionOrder } from "../utils/sidebarGovernanceRegistry";
import { canonicalizeCompanyFunctionTaxonomySlug } from "../utils/companyCapabilities";

const getCanonicalFunctions = async () => {
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

const getFunctionSlugs = async () => (await getCanonicalFunctions()).map((row: any) => String(row.slug));

const normalizedSectionOrder = (value: any, mappings: any[]) => {
  const routeCount = ASSOCIATE_SIDEBAR_ROUTES.length;
  return SIDEBAR_RESOLVED_SECTIONS.every((section) => Array.isArray(value?.[section]) && value[section].length === routeCount)
    ? value
    : deriveSidebarSectionOrder(mappings);
};
const normalizedFallbackStatuses = (value: any) => value instanceof Map ? Object.fromEntries(value.entries()) : (value || {});

const normalizedConfig = (config: any) => {
  const value = config?.toObject ? config.toObject() : config;
  return {
    ...value,
    draft: { ...value.draft, resolutionVersion: Number(value.draft?.resolutionVersion || 1), sectionOrder: normalizedSectionOrder(value.draft?.sectionOrder, value.draft?.mappings || []), fallbackStatusByRoute: normalizedFallbackStatuses(value.draft?.fallbackStatusByRoute), mappings: canonicalizeGovernanceMappings(value.draft?.mappings || []) },
    published: { ...value.published, resolutionVersion: Number(value.published?.resolutionVersion || 1), sectionOrder: normalizedSectionOrder(value.published?.sectionOrder, value.published?.mappings || []), fallbackStatusByRoute: normalizedFallbackStatuses(value.published?.fallbackStatusByRoute), mappings: canonicalizeGovernanceMappings(value.published?.mappings || []) },
  };
};

const deriveFallbackStatuses = (mappings: any[]) => Object.fromEntries(ASSOCIATE_SIDEBAR_ROUTES.map(([, routePath]) => [routePath,
  (["LIVE", "COMING_SOON", "HIDDEN"] as const).find((status) => mappings.some((row) => row.routePath === routePath && row.placement === "OTHER_SERVICES" && row.status === status)) || "HIDDEN",
]));

const groupPageRules = (mappings: any[], fallbackStatusByRoute: Record<string, string> = {}) => ASSOCIATE_SIDEBAR_ROUTES.map(([id, routePath, label]) => {
  const rows = mappings.filter((row) => row.routePath === routePath);
  const grouped = new Map<string, { placement: string; status: string; functionSlugs: string[] }>();
  rows.filter((row) => row.placement !== "OTHER_SERVICES").forEach((row) => {
    const key = `${row.placement}:${row.status}`;
    const rule: { placement: string; status: string; functionSlugs: string[] } = grouped.get(key) || { placement: row.placement, status: row.status, functionSlugs: [] };
    rule.functionSlugs.push(row.functionSlug);
    grouped.set(key, rule);
  });
  const fallbackRows = rows.filter((row) => row.placement === "OTHER_SERVICES");
  const fallbackStatus = fallbackStatusByRoute[routePath] || (["LIVE", "COMING_SOON", "HIDDEN"] as const).find((status) => fallbackRows.some((row) => row.status === status)) || "HIDDEN";
  return { id, routePath, label, rules: Array.from(grouped.values()), fallbackStatus };
});

const ensureConfig = async () => {
  const existing = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" });
  if (existing) {
    const functionSlugs = await getFunctionSlugs();
    const baseline = createBaselineSidebarMappings(functionSlugs);
    const addMissing = (current: any[] = []) => {
      const keys = new Set(current.map((row: any) => `${row.functionSlug}:${row.routePath}`));
      return [...current, ...baseline.filter((row) => !keys.has(`${row.functionSlug}:${row.routePath}`))];
    };
    const needsV2Conversion = Number((existing as any).draft?.resolutionVersion || 1) !== 2;
    const currentDraft = canonicalizeGovernanceMappings((existing as any).draft?.mappings || []);
    const draft = needsV2Conversion ? addMissing(currentDraft) : currentDraft;
    if (draft.length !== currentDraft.length || needsV2Conversion) {
      (existing as any).draft.mappings = draft;
      (existing as any).draft.resolutionVersion = 2;
      (existing as any).draft.sectionOrder = deriveSidebarSectionOrder(draft);
      (existing as any).draft.fallbackStatusByRoute = deriveFallbackStatuses(draft);
      (existing as any).draft.revision = Number((existing as any).draft.revision || 0) + 1;
      await existing.save();
    }
    return existing;
  }
  const mappings = createBaselineSidebarMappings(await getFunctionSlugs());
  return SidebarGovernanceModel.create({
    key: "associate-sidebar",
    draft: { revision: 1, resolutionVersion: 2, sectionOrder: createDefaultSidebarSectionOrder(), fallbackStatusByRoute: deriveFallbackStatuses(mappings), mappings, updatedAt: new Date() },
    published: { revision: 1, resolutionVersion: 2, sectionOrder: createDefaultSidebarSectionOrder(), fallbackStatusByRoute: deriveFallbackStatuses(mappings), mappings, updatedAt: new Date() },
  });
};

const validateSectionOrder = (input: any) => {
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

const validateFallbackStatuses = (input: any) => Object.fromEntries(ASSOCIATE_SIDEBAR_ROUTES.map(([, routePath]) => {
  const status = String(input?.[routePath] || "").toUpperCase();
  if (!(SIDEBAR_STATUSES as readonly string[]).includes(status)) throw new Error(`Fallback status is required for ${routePath}.`);
  return [routePath, status];
}));

const validateMappings = async (input: any[], requireComplete = false) => {
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
    for (const routePath of SIDEBAR_ROUTE_PATHS) {
      const fallbackStatuses = new Set(normalized.filter((row) => row.routePath === routePath && row.placement === "OTHER_SERVICES").map((row) => row.status));
      if (fallbackStatuses.size > 1) throw new Error(`Other Services fallback for ${routePath} must use one status.`);
    }
  }
  return normalized;
};

const expectedRevision = (value: unknown, field: string) => {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 0) {
    const error: any = new Error(`${field} is required and must be a non-negative integer.`);
    error.status = 400;
    error.code = "INVALID_EXPECTED_REVISION";
    throw error;
  }
  return revision;
};

const mutationError = async (res: Response, error: any, fallback: string) => {
  const status = Number(error?.status || 400);
  return res.status(status).json({
    success: false,
    message: error?.message || fallback,
    ...(error?.code ? { error: { code: error.code, ...(error.details || {}) } } : {}),
  });
};

const revisionConflict = async (expected: number, snapshot: "draft" | "published") => {
  const current: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
  const actual = Number(current?.[snapshot]?.revision || 0);
  const error: any = new Error(`Sidebar governance ${snapshot} changed from revision ${expected} to ${actual}. Reload before continuing.`);
  error.status = 409;
  error.code = "SIDEBAR_GOVERNANCE_REVISION_CONFLICT";
  error.details = { snapshot, expectedRevision: expected, currentRevision: actual };
  throw error;
};

export class SidebarGovernanceController {
  async getAdmin(_req: Request, res: Response) {
    try {
      const [config, functions] = await Promise.all([
        ensureConfig(),
        getCanonicalFunctions(),
      ]);
      const normalized = normalizedConfig(config);
      return res.json({ success: true, data: { config: normalized, pageRules: groupPageRules(normalized.draft.mappings, normalized.draft.fallbackStatusByRoute || {}), functions, routes: ASSOCIATE_SIDEBAR_ROUTES.map(([id, path, label]) => ({ id, path, label })), commonRoutes: COMMON_ASSOCIATE_SIDEBAR_ROUTES.map(([id, path, label, position]) => ({ id, path, label, position })) } });
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message || "Failed to load sidebar governance." }); }
  }

  async saveDraft(req: Request, res: Response) {
    try {
      const mappings = await validateMappings(req.body?.mappings, true);
      const sectionOrder = validateSectionOrder(req.body?.sectionOrder);
      const fallbackStatusByRoute = validateFallbackStatuses(req.body?.fallbackStatusByRoute);
      if (Number(req.body?.resolutionVersion) !== 2) throw new Error("Page-first drafts require resolutionVersion 2.");
      await ensureConfig();
      const expected = expectedRevision(req.body?.expectedDraftRevision, "expectedDraftRevision");
      const config = await SidebarGovernanceModel.findOneAndUpdate(
        { key: "associate-sidebar", "draft.revision": expected },
        { $set: { "draft.mappings": mappings, "draft.resolutionVersion": 2, "draft.sectionOrder": sectionOrder, "draft.fallbackStatusByRoute": fallbackStatusByRoute, "draft.updatedAt": new Date(), "draft.updatedBy": req.user?.id || null }, $inc: { "draft.revision": 1 } },
        { new: true, runValidators: true },
      );
      if (!config) await revisionConflict(expected, "draft");
      return res.json({ success: true, data: config });
    } catch (error: any) { return mutationError(res, error, "Failed to save draft."); }
  }

  async publish(req: Request, res: Response) {
    try {
      await ensureConfig();
      const expectedDraft = expectedRevision(req.body?.expectedDraftRevision, "expectedDraftRevision");
      const expectedPublished = expectedRevision(req.body?.expectedPublishedRevision, "expectedPublishedRevision");
      const current: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
      if (Number(current?.draft?.revision || 0) !== expectedDraft) await revisionConflict(expectedDraft, "draft");
      if (Number(current?.published?.revision || 0) !== expectedPublished) await revisionConflict(expectedPublished, "published");
      const mappings = await validateMappings(canonicalizeGovernanceMappings(current.draft?.mappings as any[]) as any[], Number(current.draft?.resolutionVersion || 1) === 2);
      const sectionOrder = validateSectionOrder(current.draft?.sectionOrder);
      const config = await SidebarGovernanceModel.findOneAndUpdate(
        { key: "associate-sidebar", "draft.revision": expectedDraft, "published.revision": expectedPublished },
        { $set: { "published.mappings": mappings, "published.resolutionVersion": Number(current.draft?.resolutionVersion || 2), "published.sectionOrder": sectionOrder, "published.fallbackStatusByRoute": current.draft?.fallbackStatusByRoute || {}, "published.updatedAt": new Date(), "published.updatedBy": req.user?.id || null }, $inc: { "published.revision": 1 } },
        { new: true, runValidators: true },
      );
      if (!config) await revisionConflict(expectedDraft, "draft");
      return res.json({ success: true, data: config });
    } catch (error: any) { return mutationError(res, error, "Failed to publish sidebar governance."); }
  }

  async resetDraft(req: Request, res: Response) {
    try {
      await ensureConfig();
      const expected = expectedRevision(req.body?.expectedDraftRevision, "expectedDraftRevision");
      const current: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
      if (Number(current?.draft?.revision || 0) !== expected) await revisionConflict(expected, "draft");
      const config = await SidebarGovernanceModel.findOneAndUpdate(
        { key: "associate-sidebar", "draft.revision": expected },
        { $set: { "draft.mappings": current.published?.mappings || [], "draft.resolutionVersion": Number(current.published?.resolutionVersion || 1), "draft.sectionOrder": normalizedSectionOrder(current.published?.sectionOrder, current.published?.mappings || []), "draft.fallbackStatusByRoute": current.published?.fallbackStatusByRoute || {}, "draft.updatedAt": new Date(), "draft.updatedBy": req.user?.id || null }, $inc: { "draft.revision": 1 } },
        { new: true, runValidators: true },
      );
      if (!config) await revisionConflict(expected, "draft");
      return res.json({ success: true, data: config });
    } catch (error: any) { return mutationError(res, error, "Failed to reset draft."); }
  }

  async getPublished(req: Request, res: Response) {
    try {
      const config = await ensureConfig();
      const role = String(req.user?.role || "").toLowerCase();
      let allowedSlugs: string[] | null = null;
      if (role === "associate") {
        const associate = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
        const company = await AssociateCompanyModel.findById((associate as any)?.associateCompany).select("providedCapabilities soughtCapabilities").lean();
        allowedSlugs = Array.from(new Set([...
          ((company as any)?.providedCapabilities || []),
          ...((company as any)?.soughtCapabilities || []),
        ].map((value) => canonicalizeCompanyFunctionTaxonomySlug(value))));
      }
      const mappings = canonicalizeGovernanceMappings(config.published?.mappings as any[]).filter((row: any) => !allowedSlugs || allowedSlugs.includes(String(row.functionSlug)));
      return res.json({ success: true, data: { revision: config.published.revision, updatedAt: config.published.updatedAt, resolutionVersion: Number((config.published as any).resolutionVersion || 1), sectionOrder: normalizedSectionOrder((config.published as any).sectionOrder, mappings), mappings } });
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message || "Failed to load published sidebar governance." }); }
  }
}

export const sidebarGovernanceController = new SidebarGovernanceController();
