import { Request, Response } from "express";
import { AssociateModel } from "../database/models/associate";
import { SidebarGovernanceModel } from "../database/models/sidebarGovernance";
import {
  ASSOCIATE_SIDEBAR_ROUTES,
  COMMON_ASSOCIATE_SIDEBAR_ROUTES,
  canonicalizeGovernanceMappings,
  migrateUnassignedFallbacks,
} from "../utils/sidebarGovernanceRegistry";
import { canonicalizeCompanyFunctionTaxonomySlug } from "../utils/companyCapabilities";
import {
  ensureAdminSidebarConfig,
  getCanonicalSidebarFunctions,
  getPublishedSidebarConfig,
  normalizeSidebarConfig,
  normalizeSidebarSectionOrder,
  parseExpectedSidebarRevision,
  sidebarRevisionConflict,
  validateSidebarFallbackStatuses,
  validateSidebarMappings,
  validateSidebarSectionOrder,
} from "../services/sidebarGovernanceService";

const mutationError = (res: Response, error: any, fallback: string) => {
  const status = Number(error?.status || 400);
  return res.status(status).json({
    success: false,
    message: error?.message || fallback,
    ...(error?.code ? { error: { code: error.code, ...(error.details || {}) } } : {}),
  });
};

const publishedMetadata = (published: any) => ({
  revision: Number(published?.revision || 0),
  resolutionVersion: Number(published?.resolutionVersion || 1),
  updatedAt: published?.updatedAt,
  updatedBy: published?.updatedBy,
});

export class SidebarGovernanceController {
  async getAdmin(_req: Request, res: Response) {
    try {
      const [config, functions] = await Promise.all([ensureAdminSidebarConfig(), getCanonicalSidebarFunctions()]);
      const normalized = normalizeSidebarConfig(config);
      return res.json({
        success: true,
        data: {
          config: { draft: normalized.draft, published: publishedMetadata(normalized.published) },
          functions,
          routes: ASSOCIATE_SIDEBAR_ROUTES.map(([id, path, label]) => ({ id, path, label })),
          commonRoutes: COMMON_ASSOCIATE_SIDEBAR_ROUTES.map(([id, path, label, position]) => ({ id, path, label, position })),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to load sidebar governance." });
    }
  }

  async saveDraft(req: Request, res: Response) {
    try {
      const mappings = await validateSidebarMappings(req.body?.mappings, true);
      const sectionOrder = validateSidebarSectionOrder(req.body?.sectionOrder);
      const fallbackStatusByRoute = validateSidebarFallbackStatuses(req.body?.fallbackStatusByRoute);
      if (Number(req.body?.resolutionVersion) !== 2) throw new Error("Page-first drafts require resolutionVersion 2.");
      await ensureAdminSidebarConfig();
      const expected = parseExpectedSidebarRevision(req.body?.expectedDraftRevision, "expectedDraftRevision");
      const config = await SidebarGovernanceModel.findOneAndUpdate(
        { key: "associate-sidebar", "draft.revision": expected },
        { $set: { "draft.mappings": mappings, "draft.resolutionVersion": 2, "draft.sectionOrder": sectionOrder, "draft.fallbackStatusByRoute": fallbackStatusByRoute, "draft.updatedAt": new Date(), "draft.updatedBy": req.user?.id || null }, $inc: { "draft.revision": 1 } },
        { new: true, runValidators: true },
      );
      if (!config) await sidebarRevisionConflict(expected, "draft");
      return res.json({ success: true, data: config });
    } catch (error: any) {
      return mutationError(res, error, "Failed to save draft.");
    }
  }

  async publish(req: Request, res: Response) {
    try {
      await ensureAdminSidebarConfig();
      const expectedDraft = parseExpectedSidebarRevision(req.body?.expectedDraftRevision, "expectedDraftRevision");
      const expectedPublished = parseExpectedSidebarRevision(req.body?.expectedPublishedRevision, "expectedPublishedRevision");
      const current: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
      if (Number(current?.draft?.revision || 0) !== expectedDraft) await sidebarRevisionConflict(expectedDraft, "draft");
      if (Number(current?.published?.revision || 0) !== expectedPublished) await sidebarRevisionConflict(expectedPublished, "published");
      const mappings = await validateSidebarMappings(canonicalizeGovernanceMappings(current.draft?.mappings as any[]) as any[], Number(current.draft?.resolutionVersion || 1) === 2);
      const sectionOrder = validateSidebarSectionOrder(current.draft?.sectionOrder);
      const config = await SidebarGovernanceModel.findOneAndUpdate(
        { key: "associate-sidebar", "draft.revision": expectedDraft, "published.revision": expectedPublished },
        { $set: { "published.mappings": mappings, "published.resolutionVersion": Number(current.draft?.resolutionVersion || 2), "published.sectionOrder": sectionOrder, "published.fallbackStatusByRoute": current.draft?.fallbackStatusByRoute || {}, "published.updatedAt": new Date(), "published.updatedBy": req.user?.id || null }, $inc: { "published.revision": 1 } },
        { new: true, runValidators: true },
      );
      if (!config) await sidebarRevisionConflict(expectedDraft, "draft");
      return res.json({ success: true, data: config });
    } catch (error: any) {
      return mutationError(res, error, "Failed to publish sidebar governance.");
    }
  }

  async resetDraft(req: Request, res: Response) {
    try {
      await ensureAdminSidebarConfig();
      const expected = parseExpectedSidebarRevision(req.body?.expectedDraftRevision, "expectedDraftRevision");
      const current: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
      if (Number(current?.draft?.revision || 0) !== expected) await sidebarRevisionConflict(expected, "draft");
      const publishedMappings = current.published?.mappings || [];
      const config = await SidebarGovernanceModel.findOneAndUpdate(
        { key: "associate-sidebar", "draft.revision": expected },
        { $set: { "draft.mappings": migrateUnassignedFallbacks(publishedMappings), "draft.resolutionVersion": Number(current.published?.resolutionVersion || 1), "draft.sectionOrder": normalizeSidebarSectionOrder(current.published?.sectionOrder, publishedMappings), "draft.fallbackStatusByRoute": current.published?.fallbackStatusByRoute || {}, "draft.updatedAt": new Date(), "draft.updatedBy": req.user?.id || null }, $inc: { "draft.revision": 1 } },
        { new: true, runValidators: true },
      );
      if (!config) await sidebarRevisionConflict(expected, "draft");
      return res.json({ success: true, data: config });
    } catch (error: any) {
      return mutationError(res, error, "Failed to reset draft.");
    }
  }

  async getPublished(req: Request, res: Response) {
    try {
      const config: any = await getPublishedSidebarConfig();
      const role = String(req.user?.role || "").toLowerCase();
      let allowedSlugs: string[] | null = null;
      if (role === "associate") {
        const associate: any = await AssociateModel.findById(req.user?.id)
          .select("associateCompany")
          .populate({ path: "associateCompany", select: "providedCapabilities soughtCapabilities" })
          .lean();
        const company = associate?.associateCompany;
        allowedSlugs = Array.from(new Set([...(company?.providedCapabilities || []), ...(company?.soughtCapabilities || [])]
          .map((value) => canonicalizeCompanyFunctionTaxonomySlug(value))));
      }
      const published = config?.published || {};
      const mappings = canonicalizeGovernanceMappings(published.mappings as any[]).filter((row: any) => (
        row.placement !== "UNASSIGNED"
        && row.status !== "HIDDEN"
        && (!allowedSlugs || allowedSlugs.includes(String(row.functionSlug)))
      ));
      return res.json({ success: true, data: { revision: published.revision, updatedAt: published.updatedAt, resolutionVersion: Number(published.resolutionVersion || 1), sectionOrder: normalizeSidebarSectionOrder(published.sectionOrder, mappings), mappings } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to load published sidebar governance." });
    }
  }
}

export const sidebarGovernanceController = new SidebarGovernanceController();
