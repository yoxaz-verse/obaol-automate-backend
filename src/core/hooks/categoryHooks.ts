import { SubCategoryModel } from "../../database/models/subCategory";
import { ProductModel } from "../../database/models/product";
import { ProductVariantModel } from "../../database/models/productVariant";

/**
 * Hook to filter variant-rates by category.
 * Reads 'category' from query, finds related product variants, and filters by those.
 */
export const categoryFilterHook = async (query: any, mode: string, id: string | undefined, req: any): Promise<any> => {
    // Only run if 'category' is in the query
    if (query.category) {
        const categoryId = query.category;

        // Remove 'category' from query so it doesn't fail in the main repository find
        const { category, ...restQuery } = query;

        try {
            // 1. Find SubCategories
            const subCategories = await SubCategoryModel.find({ category: categoryId }).select("_id");
            const subCategoryIds = subCategories.map(sc => sc._id);

            // 2. Find Products
            const products = await ProductModel.find({ subCategory: { $in: subCategoryIds } }).select("_id");
            const productIds = products.map(p => p._id);

            // 3. Find ProductVariants
            const productVariants = await ProductVariantModel.find({ product: { $in: productIds } }).select("_id");
            const productVariantIds = productVariants.map(pv => pv._id);

            // 4. Apply filter
            // If productVariantIds is empty, we should return empty result
            if (productVariantIds.length === 0) {
                return { ...restQuery, _id: "000000000000000000000000" };
            }

            // Merge with existing productVariant filter if it exists
            if (restQuery.productVariant) {
                return {
                    ...restQuery,
                    $and: [
                        { productVariant: { $in: productVariantIds } },
                        { productVariant: restQuery.productVariant }
                    ]
                };
            }

            return { ...restQuery, productVariant: { $in: productVariantIds } };

        } catch (error) {
            console.error("Error in categoryFilterHook:", error);
            // In case of error, maybe return original query (which might fail due to 'category' field) 
            // or empty result. Let's fail safe to empty.
            return { ...restQuery, _id: "000000000000000000000000" };
        }
    }

    return query;
};
