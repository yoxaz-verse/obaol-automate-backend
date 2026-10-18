import { Request, Response } from "express";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { SidebarGovernanceModel } from "../database/models/sidebarGovernance";
import { ASSOCIATE_SIDEBAR_ROUTES, COMMON_ASSOCIATE_SIDEBAR_ROUTES, SIDEBAR_PLACEMENTS, SIDEBAR_ROUTE_PATHS, SIDEBAR_STATUSES, canonicalizeGovernanceMappings, createBaselineSidebarMappings } from "../utils/sidebarGovernanceRegistry";
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

const normalizedConfig = (config: any) => {
  const value = config?.toObject ? config.toObject() : config;
  return {
    ...value,
    draft: { ...value.draft, mappings: canonicalizeGovernanceMappings(value.draft?.mappings || []) },
    published: { ...value.published, mappings: canonicalizeGovernanceMappings(value.published?.mappings || []) },
  };
};

const ensureConfig = async () => {
  const existing = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" });
  if (existing) return existing;
  const mappings = createBaselineSidebarMappings(await getFunctionSlugs());
  return SidebarGovernanceModel.create({
    key: "associate-sidebar",
    draft: { revision: 1, mappings, updatedAt: new Date() },
    published: { revision: 1, mappings, updatedAt: new Date() },
  });
};

const validateMappings = async (input: any[]) => {
  if (!Array.isArray(input)) throw new Error("Mappings must be an array.");
  const functionSlugs = new Set(await getFunctionSlugs());
  const seen = new Set<string>();
  return input.map((row, index) => {
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
      return res.json({ success: true, data: { config: normalizedConfig(config), functions, routes: ASSOCIATE_SIDEBAR_ROUTES.map(([id, path, label]) => ({ id, path, label })), commonRoutes: COMMON_ASSOCIATE_SIDEBAR_ROUTES.map(([id, path, label, position]) => ({ id, path, label, position })) } });
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message || "Failed to load sidebar governance." }); }
  }

  async saveDraft(req: Request, res: Response) {
    try {
      const mappings = await validateMappings(req.body?.mappings);
      await ensureConfig();
      const expected = expectedRevision(req.body?.expectedDraftRevision, "expectedDraftRevision");
      const config = await SidebarGovernanceModel.findOneAndUpdate(
        { key: "associate-sidebar", "draft.revision": expected },
        { $set: { "draft.mappings": mappings, "draft.updatedAt": new Date(), "draft.updatedBy": req.user?.id || null }, $inc: { "draft.revision": 1 } },
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
      const mappings = await validateMappings(canonicalizeGovernanceMappings(current.draft?.mappings as any[]) as any[]);
      const config = await SidebarGovernanceModel.findOneAndUpdate(
        { key: "associate-sidebar", "draft.revision": expectedDraft, "published.revision": expectedPublished },
        { $set: { "published.mappings": mappings, "published.updatedAt": new Date(), "published.updatedBy": req.user?.id || null }, $inc: { "published.revision": 1 } },
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
        { $set: { "draft.mappings": current.published?.mappings || [], "draft.updatedAt": new Date(), "draft.updatedBy": req.user?.id || null }, $inc: { "draft.revision": 1 } },
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
      return res.json({ success: true, data: { revision: config.published.revision, updatedAt: config.published.updatedAt, mappings } });
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message || "Failed to load published sidebar governance." }); }
  }
}

export const sidebarGovernanceController = new SidebarGovernanceController();
