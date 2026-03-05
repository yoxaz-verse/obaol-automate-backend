import { Router } from "express";
import { VariantRateModel } from "../database/models/variantRate";
import authenticateToken from "../middlewares/auth";

const router = Router();

// Diagnostic endpoint to check Marketplace data
router.get("/marketplace-diagnostic", authenticateToken, async (req, res) => {
    try {
        const user = (req as any).user;
        const userId = user?.id;

        console.log("[Marketplace Diagnostic] User ID:", userId);

        // Count total variant rates
        const totalCount = await VariantRateModel.countDocuments({});
        console.log("[Marketplace Diagnostic] Total VariantRates:", totalCount);

        // Count live variant rates
        const liveCount = await VariantRateModel.countDocuments({ isLive: true });
        console.log("[Marketplace Diagnostic] Live VariantRates:", liveCount);

        const marketplaceBase = { associate: { $ne: userId } };

        const [marketplaceLiveCount, marketplaceOfflineStrictFalseCount, marketplaceOfflineInclusiveCount] = await Promise.all([
            VariantRateModel.countDocuments({
                ...marketplaceBase,
                isLive: true,
            }),
            VariantRateModel.countDocuments({
                ...marketplaceBase,
                isLive: false,
            }),
            VariantRateModel.countDocuments({
                ...marketplaceBase,
                isLive: { $ne: true },
            }),
        ]);

        console.log("[Marketplace Diagnostic] Marketplace Live:", marketplaceLiveCount);
        console.log("[Marketplace Diagnostic] Marketplace Offline (strict false):", marketplaceOfflineStrictFalseCount);
        console.log("[Marketplace Diagnostic] Marketplace Offline (inclusive != true):", marketplaceOfflineInclusiveCount);

        const [sampleLiveItems, sampleOfflineStrictItems, sampleOfflineInclusiveItems] = await Promise.all([
            VariantRateModel.find({
                ...marketplaceBase,
                isLive: true,
            })
                .limit(5)
                .populate("associate")
                .populate({
                    path: "productVariant",
                    populate: { path: "product" }
                }),
            VariantRateModel.find({
                ...marketplaceBase,
                isLive: false,
            })
                .limit(5)
                .populate("associate")
                .populate({
                    path: "productVariant",
                    populate: { path: "product" }
                }),
            VariantRateModel.find({
                ...marketplaceBase,
                isLive: { $ne: true },
            })
                .limit(5)
                .populate("associate")
                .populate({
                    path: "productVariant",
                    populate: { path: "product" }
                }),
        ]);

        const toSample = (items: any[]) => items.map(item => ({
            _id: item._id,
            rate: item.rate,
            isLive: item.isLive,
            associate: (item.associate as any)?.name || item.associate,
            product: (item.productVariant as any)?.product?.name,
            variant: (item.productVariant as any)?.name
        }));

        console.log("[Marketplace Diagnostic] Live sample items:", sampleLiveItems.length);
        console.log("[Marketplace Diagnostic] Offline strict sample items:", sampleOfflineStrictItems.length);
        console.log("[Marketplace Diagnostic] Offline inclusive sample items:", sampleOfflineInclusiveItems.length);

        res.json({
            success: true,
            data: {
                totalVariantRates: totalCount,
                liveVariantRates: liveCount,
                currentUserId: userId,
                marketplaceLiveCount,
                marketplaceOfflineStrictFalseCount,
                marketplaceOfflineInclusiveCount,
                sampleLiveItems: toSample(sampleLiveItems),
                sampleOfflineStrictItems: toSample(sampleOfflineStrictItems),
                sampleOfflineInclusiveItems: toSample(sampleOfflineInclusiveItems),
            }
        });
    } catch (error: any) {
        console.error("[Marketplace Diagnostic] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
