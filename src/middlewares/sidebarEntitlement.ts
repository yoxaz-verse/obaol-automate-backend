import type { NextFunction, Request, Response } from "express";
import { AssociateModel } from "../database/models/associate";
import { getPublishedSidebarConfig } from "../services/sidebarGovernanceService";
import { canonicalizeCompanyFunctionTaxonomySlug } from "../utils/companyCapabilities";
import { canonicalizeGovernanceMappings, canonicalizeSidebarRoutePath } from "../utils/sidebarGovernanceRegistry";

type CacheEntry = { revision: number; livePaths: Set<string>; expiresAt: number };
const entitlementCache = new Map<string, CacheEntry>();

const resolveAssociateLivePaths = async (associateId: string) => {
  const config: any = await getPublishedSidebarConfig();
  const published = config?.published || {};
  const revision = Number(published.revision || 0);
  const cached = entitlementCache.get(associateId);
  if (cached && cached.revision === revision && cached.expiresAt > Date.now()) return cached.livePaths;

  const associate: any = await AssociateModel.findById(associateId)
    .select("associateCompany")
    .populate({ path: "associateCompany", select: "providedCapabilities soughtCapabilities" })
    .lean();
  const provided = new Set((associate?.associateCompany?.providedCapabilities || []).map(canonicalizeCompanyFunctionTaxonomySlug));
  const sought = new Set((associate?.associateCompany?.soughtCapabilities || []).map(canonicalizeCompanyFunctionTaxonomySlug));
  const livePaths = new Set<string>();

  for (const row of canonicalizeGovernanceMappings(published.mappings || [])) {
    if (row.status !== "LIVE" || row.placement === "UNASSIGNED") continue;
    const slug = canonicalizeCompanyFunctionTaxonomySlug(row.functionSlug);
    const applies = row.placement === "BOTH"
      ? provided.has(slug) || sought.has(slug)
      : row.placement === "PROVIDING"
        ? provided.has(slug)
        : row.placement === "SEEKING"
          ? sought.has(slug)
          : provided.has(slug) || sought.has(slug);
    if (applies) livePaths.add(canonicalizeSidebarRoutePath(row.routePath));
  }
  entitlementCache.set(associateId, { revision, livePaths, expiresAt: Date.now() + 60_000 });
  return livePaths;
};

/** Adds published sidebar governance to existing role and resource authorization. */
export const requireSidebarEntitlement = (routePath: string) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = String(req.user?.role || "").trim().toLowerCase();
    if (role !== "associate") return next();
    const userId = String(req.user?.id || "");
    if (!userId) return res.status(403).json({ success: false, message: "Associate access is required." });
    const livePaths = await resolveAssociateLivePaths(userId);
    if (!livePaths.has(canonicalizeSidebarRoutePath(routePath))) {
      return res.status(403).json({ success: false, message: "This workspace feature is not enabled for your company." });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const clearSidebarEntitlementCache = () => entitlementCache.clear();
