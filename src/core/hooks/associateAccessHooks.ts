import { CatalogItemModel } from "../../database/models/catalogItem";
import { AssociateModel } from "../../database/models/associate";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { normalizeCompanyFunctionSlug } from "../../utils/companyCapabilities";

const EMPTY_QUERY = { _id: "000000000000000000000000" };

const mergeWithScope = (baseQuery: any, scopeQuery: any) => {
    const base = { ...(baseQuery || {}) };
    if (!Object.keys(base).length) return scopeQuery;
    return { $and: [base, scopeQuery] };
};

const stripControlQueryKeys = (input: any) => {
    const cleaned = { ...(input || {}) };
    delete cleaned.page;
    delete cleaned.limit;
    delete cleaned.sort;
    delete cleaned.search;
    delete cleaned.companyCapability;
    return cleaned;
};

export const associateCompanyCapabilityFilterHook = async (
    query: any,
    _mode: string,
    _id: string | undefined,
    req: any,
): Promise<any> => {
    const requestedCapability = String(req?.query?.companyCapability || query?.companyCapability || "").trim();
    if (!requestedCapability) return query;

    const cleanedQuery = { ...(query || {}) };
    delete cleanedQuery.companyCapability;

    if (String(req?.user?.role || "").toLowerCase() !== "admin") {
        const error: any = new Error("Company capability filtering is restricted to administrators.");
        error.statusCode = 403;
        throw error;
    }

    const capability = normalizeCompanyFunctionSlug(requestedCapability);
    if (!capability) return mergeWithScope(cleanedQuery, EMPTY_QUERY);

    const companyIds = await AssociateCompanyModel.distinct("_id", {
        providedCapabilities: capability,
        isDeleted: { $ne: true },
    });

    return mergeWithScope(cleanedQuery, {
        associateCompany: { $in: companyIds },
    });
};

/**
 * Hook to inject filters for associates.
 * Ensures associates only see their own catalog items and personalized rates.
 */
export const associateFilterHook = async (query: any, mode: string, id: string | undefined, req: any): Promise<any> => {
    if (!req?.user) return query;

    const user = req.user;
    if (user.role?.toLowerCase() === "associate") {
        const associateId = user.id;

        if (req.params?.entity === "variant-rates") {
            const isMarketplaceView =
                req?.__marketplaceView === true ||
                String(req.query?.view || "").toLowerCase() === "marketplace";

            if (isMarketplaceView) {
                // The marketplace is a shared catalogue. Ownership only controls
                // mutations; it must not hide an otherwise eligible listing.
                return { ...query };
            } else {
                // DEFAULT / MY PRODUCTS: Show only my own (only when linked to a company)
                const associate = await AssociateModel.findById(associateId)
                    .select("_id associateCompany")
                    .lean();

                if (!associate || !(associate as any).associateCompany) {
                    const emptyOwnProductsQuery: any = { ...query, ...EMPTY_QUERY };
                    return emptyOwnProductsQuery;
                }

                return { ...query, associate: associateId };
            }
        }

        // If we are looking at catalog-items (Added to Catalog)
        if (req.params?.entity === "catalog-items") {
            return { ...query, associateId };
        }

        // If we are looking at displayed-rates
        if (req.params?.entity === "displayed-rates") {
            return { ...query, associate: associateId };
        }

        // If we are looking at associates, scope to own company members (+ self fallback).
        if (req.params?.entity === "associates") {
            const associate = await AssociateModel.findById(associateId)
                .select("_id associateCompany")
                .lean();
            const ownCompanyId = String((associate as any)?.associateCompany || "");
            const baseQuery = stripControlQueryKeys(query);

            if (!ownCompanyId) {
                return mergeWithScope(baseQuery, { _id: associateId });
            }

            return mergeWithScope(baseQuery, {
                $or: [
                    { _id: associateId },
                    { associateCompany: ownCompanyId },
                ],
            });
        }
    }

    return query;
};
