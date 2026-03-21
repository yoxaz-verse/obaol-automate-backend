import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { AssociateModel } from "../../database/models/associate";

const router = Router();

router.post("/associates/onboarding/tutorial", authenticateToken, async (req: any, res) => {
  try {
    const roleLower = String(req.user?.role || "").toLowerCase();
    if (roleLower !== "associate") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const status = String(req.body?.status || "").toUpperCase();
    if (!["SKIPPED", "COMPLETED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be SKIPPED or COMPLETED.",
      });
    }

    const updated = await AssociateModel.findByIdAndUpdate(
      req.user.id,
      {
        dashboardTutorialStatus: status,
        dashboardTutorialUpdatedAt: new Date(),
      },
      { new: true }
    )
      .select("dashboardTutorialStatus dashboardTutorialUpdatedAt")
      .lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Associate not found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        dashboardTutorialStatus: updated.dashboardTutorialStatus,
        dashboardTutorialUpdatedAt: updated.dashboardTutorialUpdatedAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to update tutorial status.",
      error: error?.message || "Unknown error",
    });
  }
});

export default router;
