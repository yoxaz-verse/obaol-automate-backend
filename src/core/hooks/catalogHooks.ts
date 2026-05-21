import { CatalogItemModel } from "../../database/models/catalogItem";
import { AssociateModel } from "../../database/models/associate";
import { ExecutionMode } from "../types";
import { logError } from "../../utils/errorLogger";

/**
 * Hook to automatically create a CatalogItem when a VariantRate is created by an associate.
 * This ensures that an associate's own rates appear in their Catalog view.
 */
export const syncVariantRateToCatalog = async (
    entityName: string,
    data: any,
    mode: ExecutionMode,
    req: any
): Promise<void> => {
    try {
        if (entityName !== "variant-rates") return;

        const user = req?.user;
        if (!user || user.role?.toLowerCase() !== "associate") return;

        if (mode === ExecutionMode.CREATE) {
            // "data" is the created VariantRate document
            const variantRate = data;
            const associateId = user.id;

            // Get associate's company
            const associate = await AssociateModel.findById(associateId);
            if (!associate?.associateCompany) return;
            const associateIsApproved =
                String((associate as any)?.registrationStatus || "").toUpperCase() === "APPROVED";

            // Check if already exists (defensive)
            const exists = await CatalogItemModel.findOne({
                associateId,
                baseRateId: variantRate._id
            });

            if (!exists) {
                await CatalogItemModel.create({
                    associateId,
                    associateCompanyId: associate.associateCompany,
                    productVariantId: variantRate.productVariant,
                    baseRateId: variantRate._id,
                    margin: 0,
                    finalPrice: variantRate.rate, // No markup for self
                    isLive: associateIsApproved ? variantRate.isLive : false,
                    listingState: associateIsApproved ? "LIVE" : "DRAFT",
                    activatedAt: associateIsApproved ? new Date() : null,
                    activatedBy: null,
                    customTitle: undefined,
                    customDescription: undefined
                });
            }
        }

        if (mode === ExecutionMode.UPDATE) {
            // "data" is the updated VariantRate document
            const variantRate = data;

            // Sync isLive status to all catalog items referencing this variant rate
            await CatalogItemModel.updateMany(
                { baseRateId: variantRate._id },
                { isLive: variantRate.isLive }
            );
        }

        if (mode === ExecutionMode.DELETE) {
            // "data" is the ID of the deleted VariantRate (or the deleted doc, depending on CrudEngine)
            // In CrudEngine.delete, "deleted" (data) is the doc returned by repository.delete.
            const variantRateId = data?._id;
            if (variantRateId) {
                // Delete ALL catalog items referencing this variant rate
                // (both owner's and mediators')
                await CatalogItemModel.deleteMany({ baseRateId: variantRateId });
            }
        }
    } catch (error) {
        logError(error, req, "syncVariantRateToCatalog");
    }
};
