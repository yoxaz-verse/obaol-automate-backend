import { VariantRateModel } from "../../database/models/variantRate";

/**
 * Hook to calculate statistics for associate companies.
 * Attaches totalProducts and liveProducts counts to each company.
 */
export const companyStatsHook = async (rows: any[]): Promise<any[]> => {
    if (!rows || rows.length === 0) return rows;

    // Extract IDs of companies delivered in this read operation
    const companyIds = rows.map(r => r._id);

    // Aggregate statistics from VariantRate collection for all these companies
    const stats = await VariantRateModel.aggregate([
        {
            $match: {
                associateCompany: { $in: companyIds }
            }
        },
        {
            $group: {
                _id: "$associateCompany",
                totalProducts: { $sum: 1 },
                liveProducts: {
                    $sum: { $cond: ["$isLive", 1, 0] }
                }
            }
        }
    ]);

    // Create a lookup map for efficient merging
    const statsMap = new Map(stats.map(s => [s._id.toString(), s]));

    return rows.map(company => {
        // Handle both Mongoose documents and plain objects
        const companyObj = typeof company.toObject === 'function' ? company.toObject() : company;
        const companyIdStr = companyObj._id.toString();

        const companyStats = statsMap.get(companyIdStr) || { totalProducts: 0, liveProducts: 0 };

        return {
            ...companyObj,
            stats: {
                totalProducts: companyStats.totalProducts,
                liveProducts: companyStats.liveProducts
            }
        };
    });
};
