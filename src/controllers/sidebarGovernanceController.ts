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

export class SidebarGovernanceController {
  async getAdmin(_req: Request, res: Response) {
    try {
      const [config, functions] = await Promise.all([
        ensureConfig(),
        getCanonicalFunctions(),
      ]);
      return res.json({ success: true, data: { config: normalizedConfig(config), functions, routes: ASSOCIATE_SIDEBAR_ROUTES.map(([id, path, label]) => ({ id, path, label })), commonRoutes: COMMON_ASSOCIATE_SIDEBAR_ROUTES.map(([id, path, label]) => ({ id, path, label })) } });
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message || "Failed to load sidebar governance." }); }
  }

  async saveDraft(req: Request, res: Response) {
    try {
      const mappings = await validateMappings(req.body?.mappings);
      const config = await ensureConfig();
      config.draft = { revision: Number(config.draft?.revision || 0) + 1, mappings, updatedAt: new Date(), updatedBy: req.user?.id as any } as any;
      await config.save();
      return res.json({ success: true, data: config });
    } catch (error: any) { return res.status(400).json({ success: false, message: error.message || "Failed to save draft." }); }
  }

  async publish(req: Request, res: Response) {
    try {
      const config = await ensureConfig();
      const mappings = await validateMappings(canonicalizeGovernanceMappings(config.draft?.mappings as any[]) as any[]);
      const revision = Number(config.published?.revision || 0) + 1;
      config.published = { revision, mappings, updatedAt: new Date(), updatedBy: req.user?.id as any } as any;
      await config.save();
      return res.json({ success: true, data: config });
    } catch (error: any) { return res.status(400).json({ success: false, message: error.message || "Failed to publish sidebar governance." }); }
  }

  async resetDraft(req: Request, res: Response) {
    try {
      const config = await ensureConfig();
      config.draft = { revision: Number(config.draft?.revision || 0) + 1, mappings: config.published.mappings as any, updatedAt: new Date(), updatedBy: req.user?.id as any } as any;
      await config.save();
      return res.json({ success: true, data: config });
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message || "Failed to reset draft." }); }
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
