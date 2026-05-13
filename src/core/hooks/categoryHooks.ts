import { SubCategoryModel } from "../../database/models/subCategory";
import { ProductModel } from "../../database/models/product";
import { ProductVariantModel } from "../../database/models/productVariant";
import { VariantRateModel } from "../../database/models/variantRate";

/**
 * Hook to filter variant-rates, catalog-items, and displayed-rates by hierarchy (category, subCategory, product).
 * Translates these high-level filters into appropriate IDs for each entity.
 */
export const categoryFilterHook = async (query: any, mode: string, id: string | undefined, req: any): Promise<any> => {
    const { category, subCategory, product, classification, classifications, ...restQuery } = query;

    const rawClassifications = [
        ...(Array.isArray(classification) ? classification : [classification]),
        ...(Array.isArray(classifications) ? classifications : [classifications]),
    ].filter(Boolean);

    const normalizedClassifications = Array.from(
        new Set(
            rawClassifications
                .map((item: any) => String(item || "").trim().toLowerCase())
                .filter(Boolean)
        )
    );

    const fieldForClassification = (label: string): string | null => {
        if (label === "conventional") return "isConventional";
        if (label === "natural") return "isNatural";
        if (label === "organic") return "isOrganic";
        if (label === "gi" || label === "gitag" || label === "gi_tag" || label === "gi-tag") return "isGiTagged";
        return null;
    };

    // If none of the hierarchical filters are present, return original query
    if (!category && !subCategory && !product && normalizedClassifications.length === 0) {
        return query;
    }

    try {
        let currentTargetIds: any[] = [];
        let hasFilter = false;

        // 0. Handle classification-only filter on products
        if (normalizedClassifications.length > 0) {
            const productQuery: any = {};
            const mappedFields = normalizedClassifications
                .map(fieldForClassification)
                .filter((f): f is string => Boolean(f));

            if (mappedFields.length > 0) {
                productQuery.$or = mappedFields.map((field) => {
                    if (field === "isConventional") {
                        return {
                            $or: [
                                { isConventional: true },
                                {
                                    $and: [
                                        { $or: [{ isNatural: { $exists: false } }, { isNatural: false }] },
                                        { $or: [{ isOrganic: { $exists: false } }, { isOrganic: false }] },
                                        { $or: [{ isGiTagged: { $exists: false } }, { isGiTagged: false }] },
                                    ],
                                },
                            ],
                        };
                    }
                    return { [field]: true };
                });
            }
            const productsByClass = await ProductModel.find(productQuery).select("_id");
            currentTargetIds = productsByClass.map((p) => p._id);
            hasFilter = true;
        }

        // 1. Handle Product Filter (Direct parent of ProductVariant)
        if (product) {
            hasFilter = true;
            const explicitProductIds = Array.isArray(product) ? product : [product];
            currentTargetIds = currentTargetIds.length
                ? currentTargetIds.filter((id) => explicitProductIds.map(String).includes(String(id)))
                : explicitProductIds;
        }
        // 2. Handle SubCategory Filter
        else if (subCategory) {
            hasFilter = true;
            const subCategoryIds = Array.isArray(subCategory) ? subCategory : [subCategory];
            const products = await ProductModel.find({ subCategory: { $in: subCategoryIds } }).select("_id");
            const subCategoryProductIds = products.map(p => p._id);
            currentTargetIds = currentTargetIds.length
                ? currentTargetIds.filter((id) => subCategoryProductIds.map(String).includes(String(id)))
                : subCategoryProductIds;
        }
        // 3. Handle Category Filter
        else if (category) {
            hasFilter = true;
            const categoryIds = Array.isArray(category) ? category : [category];
            const subCategories = await SubCategoryModel.find({ category: { $in: categoryIds } }).select("_id");
            const subCategoryIds = subCategories.map(sc => sc._id);
            const products = await ProductModel.find({ subCategory: { $in: subCategoryIds } }).select("_id");
            const categoryProductIds = products.map(p => p._id);
            currentTargetIds = currentTargetIds.length
                ? currentTargetIds.filter((id) => categoryProductIds.map(String).includes(String(id)))
                : categoryProductIds;
        }

        if (hasFilter) {
            // Find ProductVariants for the resulting products
            const productVariants = await ProductVariantModel.find({ product: { $in: currentTargetIds } }).select("_id");
            const productVariantIds = productVariants.map(pv => pv._id);

            const entity = req.params?.entity;
            let filterField = "productVariant";
            let finalTargetIds = productVariantIds;

            if (entity === "catalog-items") {
                filterField = "productVariantId";
            } else if (entity === "displayed-rates") {
                // For displayed-rates, we need to find the VariantRate IDs first
                const variantRates = await VariantRateModel.find({ productVariant: { $in: productVariantIds } }).select("_id");
                finalTargetIds = variantRates.map(vr => vr._id);
                filterField = "variantRate";
            }

            // If no target IDs found but we had a filter, return a query that results in nothing
            if (finalTargetIds.length === 0) {
                return { ...restQuery, [filterField]: { $in: ["000000000000000000000000"] } };
            }

            // Merge with existing filter if it exists
            if (restQuery[filterField]) {
                const existing = Array.isArray(restQuery[filterField])
                    ? restQuery[filterField]
                    : [restQuery[filterField]];

                return {
                    ...restQuery,
                    [filterField]: { $in: finalTargetIds.filter(id => existing.includes(String(id))) }
                };
            }

            return { ...restQuery, [filterField]: { $in: finalTargetIds } };
        }

    } catch (error) {
        console.error("Error in categoryFilterHook:", error);
        // Determine the filter field for the error case as well
        const entity = req.params?.entity;
        let filterField = "productVariant";
        if (entity === "catalog-items") {
            filterField = "productVariantId";
        } else if (entity === "displayed-rates") {
            filterField = "variantRate";
        }
        return { ...restQuery, [filterField]: { $in: ["000000000000000000000000"] } };
    }

    return restQuery;
};
