import { CatalogItemModel } from "../../database/models/catalogItem";
import { AssociateModel } from "../../database/models/associate";
import { AssociateCompanyModel } from "../../database/models/associateCompany";

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
            const view = req.query?.view;

            if (view === "marketplace") {
                // MARKETPLACE (Associate): only approved/verified supplier ecosystem, excluding self-owned rates.
                const [approvedCompanies, approvedAssociates] = await Promise.all([
                    AssociateCompanyModel.find({
                        registrationStatus: "APPROVED",
                        isApproved: true
                    })
                        .select("_id")
                        .lean(),
                    AssociateModel.find({
                        registrationStatus: "APPROVED",
                        isActive: true
                    })
                        .select("_id")
                        .lean(),
                ]);

                const approvedCompanyIds = approvedCompanies.map((c: any) => c._id);
                const approvedAssociateIds = approvedAssociates.map((a: any) => a._id);

                if (!approvedCompanyIds.length || !approvedAssociateIds.length) {
                    const emptyMarketplaceQuery: any = { ...query, _id: "000000000000000000000000" };
                    delete emptyMarketplaceQuery.view;
                    return emptyMarketplaceQuery;
                }

                const marketQuery = {
                    ...query,
                    associate: { $in: approvedAssociateIds, $ne: associateId },
                    associateCompany: { $in: approvedCompanyIds }
                };
                delete (marketQuery as any).view;
                return marketQuery;
            } else {
                // DEFAULT / MY PRODUCTS: Show only my own
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
    }

    return query;
};
