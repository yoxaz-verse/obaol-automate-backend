import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { VariantRateModel } from "../../database/models/variantRate";

const router = Router();

router.use(authenticateToken);

router.get("/marketplace-stats", async (req: any, res) => {
  try {
    const roleLower = String(req?.user?.role || "").toLowerCase();
    if (!["admin", "operator", "team"].includes(roleLower)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const userId = String(req?.user?.id || "");
    const baseQuery = {
      isDeleted: { $ne: true },
      associate: { $ne: userId },
    } as any;

    const [live, offline] = await Promise.all([
      VariantRateModel.countDocuments({ ...baseQuery, isLive: true }),
      VariantRateModel.countDocuments({ ...baseQuery, isLive: { $ne: true } }),
    ]);

    return res.json({
      success: true,
      data: {
        live,
        offline,
        total: live + offline,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch marketplace stats.",
    });
  }
});

export default router;
