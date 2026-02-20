import { CatalogItemModel } from "../../database/models/catalogItem";

/**
 * Hook to inject filters for associates.
 * Ensures associates only see their own catalog items and personalized rates.
 */
export const associateFilterHook = async (query: any, mode: string, id: string | undefined, req: any): Promise<any> => {
    if (!req?.user) return query;

    const user = req.user;
    if (user.role?.toLowerCase() === "associate") {
        const associateId = user.id;

        // If we are looking at variant-rates
        // Debugging logs
        console.log(`[AssociateHook] Entity: ${req.params?.entity}, View: ${req.query?.view}, User: ${user.email}`);

        if (req.params?.entity === "variant-rates") {
            const view = req.query?.view;
            console.log(`[AssociateHook] View detected: ${view}`);

            if (view === "marketplace") {
                // MARKETPLACE: Show all external rates (live or not)
                const marketQuery = {
                    ...query,
                    associate: { $ne: associateId }
                };
                delete marketQuery.view; // CRITICAL: Prevent Mongo from searching for a 'view' field that doesn't exist
                console.log(`[AssociateHook] Marketplace Query:`, JSON.stringify(marketQuery));
                return marketQuery;
            } else {
                // DEFAULT / MY PRODUCTS: Show only my own
                console.log(`[AssociateHook] Default Query (My Products)`);
                return { ...query, associate: associateId };
            }
        }

        // If we are looking at catalog-items (Added to Catalog)
        if (req.params?.entity === "catalog-items") {
            // Re-evaluating: The user wants "Added to Catalog" to NOT show owned products.
            // Since we removed the sync hook, most new ones will be external.
            return { ...query, associateId };
        }

        // If we are looking at displayed-rates
        if (req.params?.entity === "displayed-rates") {
            return { ...query, associate: associateId };
        }
    }

    return query;
};
