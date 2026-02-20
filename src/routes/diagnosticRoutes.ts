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

        // Count variant rates from other associates (marketplace query)
        const marketplaceCount = await VariantRateModel.countDocuments({
            isLive: true,
            associate: { $ne: userId }
        });
        console.log("[Marketplace Diagnostic] Marketplace VariantRates (live + not mine):", marketplaceCount);

        // Get sample marketplace items (first 5)
        const sampleItems = await VariantRateModel.find({
            isLive: true,
            associate: { $ne: userId }
        })
            .limit(5)
            .populate("associate")
            .populate({
                path: "productVariant",
                populate: { path: "product" }
            });

        console.log("[Marketplace Diagnostic] Sample items:", sampleItems.length);

        res.json({
            success: true,
            data: {
                totalVariantRates: totalCount,
                liveVariantRates: liveCount,
                marketplaceVariantRates: marketplaceCount,
                currentUserId: userId,
                sampleItems: sampleItems.map(item => ({
                    _id: item._id,
                    rate: item.rate,
                    isLive: item.isLive,
                    associate: (item.associate as any)?.name || item.associate,
                    product: (item.productVariant as any)?.product?.name,
                    variant: (item.productVariant as any)?.name
                }))
            }
        });
    } catch (error: any) {
        console.error("[Marketplace Diagnostic] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
