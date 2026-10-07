import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { VariantRateModel } from "../../database/models/variantRate";
import { RateRevealEventModel } from "../../database/models/rateRevealEvent";
import { AssociateModel } from "../../database/models/associate";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import mongoose from "mongoose";

const router = Router();

router.use(authenticateToken);

router.post("/:id/reveal", async (req: any, res) => {
  try {
    const roleLower = String(req?.user?.role || "").toLowerCase();
    if (!["associate", "customer"].includes(roleLower)) {
      return res.status(403).json({ success: false, message: "Rate reveal is only required for marketplace members." });
    }
    const { id } = req.params;
    const sessionId = String(req.body?.sessionId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id) || !sessionId || sessionId.length > 120) {
      return res.status(400).json({ success: false, message: "A valid listing and session are required." });
    }
    const listing = await VariantRateModel.findOne({
      _id: id,
      isDeleted: { $ne: true },
      associate: { $ne: req.user.id },
    }).select("rate commission isLive associate productVariant").lean();
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

    const viewer: any = await AssociateModel.findById(req.user.id)
      .select("name email phone associateCompany")
      .populate("associateCompany", "name")
      .lean();
    await RateRevealEventModel.findOneAndUpdate(
      { variantRate: listing._id, viewerId: req.user.id, sessionId },
      {
        $setOnInsert: {
          viewerRole: roleLower,
          companyId: viewer?.associateCompany?._id || null,
          viewerName: viewer?.name || "",
          viewerEmail: viewer?.email || "",
          viewerPhone: viewer?.phone || "",
          companyName: viewer?.associateCompany?.name || "",
          listingWasLive: Boolean(listing.isLive),
          revealedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const finalPrice = Number(listing.rate || 0) + Number(listing.commission || 0);
    return res.json({ success: true, data: { variantRateId: String(listing._id), finalPrice, listingWasLive: Boolean(listing.isLive) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Failed to reveal rate." });
  }
});

router.get("/rate-interest/analytics", async (req: any, res) => {
  try {
    if (String(req?.user?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const match: any = {};
    if (req.query.from || req.query.to) {
      match.revealedAt = {};
      if (req.query.from) match.revealedAt.$gte = new Date(String(req.query.from));
      if (req.query.to) match.revealedAt.$lte = new Date(String(req.query.to));
    }
    if (req.query.status === "live") match.listingWasLive = true;
    if (req.query.status === "past") match.listingWasLive = false;
    if (req.query.companyId && mongoose.Types.ObjectId.isValid(String(req.query.companyId))) match.companyId = new mongoose.Types.ObjectId(String(req.query.companyId));
    if (req.query.viewerId && mongoose.Types.ObjectId.isValid(String(req.query.viewerId))) match.viewerId = new mongoose.Types.ObjectId(String(req.query.viewerId));
    if (req.query.listingId && mongoose.Types.ObjectId.isValid(String(req.query.listingId))) match.variantRate = new mongoose.Types.ObjectId(String(req.query.listingId));

    const pipeline: any[] = [
      { $match: match },
      { $lookup: { from: VariantRateModel.collection.name, localField: "variantRate", foreignField: "_id", as: "listing" } },
      { $unwind: "$listing" },
      { $lookup: { from: "productvariants", localField: "listing.productVariant", foreignField: "_id", as: "variant" } },
      { $unwind: { path: "$variant", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "products", localField: "variant.product", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ];
    const text = String(req.query.search || req.query.product || "").trim();
    if (text) {
      const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pipeline.push({ $match: { $or: [
        { viewerName: { $regex: escaped, $options: "i" } },
        { viewerEmail: { $regex: escaped, $options: "i" } },
        { companyName: { $regex: escaped, $options: "i" } },
        { "product.name": { $regex: escaped, $options: "i" } },
        { "variant.name": { $regex: escaped, $options: "i" } },
      ] } });
    }
    const [summaryRows, rows, totalRows] = await Promise.all([
      RateRevealEventModel.aggregate([
        ...pipeline,
        { $group: { _id: null, revealSessions: { $sum: 1 }, uniqueViewersSet: { $addToSet: "$viewerId" }, listingsSet: { $addToSet: "$variantRate" } } },
        { $project: { _id: 0, revealSessions: 1, uniqueViewers: { $size: "$uniqueViewersSet" }, listings: { $size: "$listingsSet" } } },
      ]),
      RateRevealEventModel.aggregate([...pipeline, { $sort: { revealedAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: {
        viewerId: 1, viewerName: 1, viewerEmail: 1, viewerPhone: 1, viewerRole: 1, companyId: 1, companyName: 1,
        variantRate: 1, listingWasLive: 1, revealedAt: 1, product: "$product.name", variant: "$variant.name",
      } }]),
      RateRevealEventModel.aggregate([...pipeline, { $count: "total" }]),
    ]);
    const [trend, topProducts, topListings] = await Promise.all([
      RateRevealEventModel.aggregate([...pipeline, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$revealedAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, date: "$_id", count: 1 } }]),
      RateRevealEventModel.aggregate([...pipeline, { $group: { _id: "$product.name", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }, { $project: { _id: 0, name: { $ifNull: ["$_id", "Unknown product"] }, count: 1 } }]),
      RateRevealEventModel.aggregate([...pipeline, { $group: { _id: "$variantRate", product: { $first: "$product.name" }, variant: { $first: "$variant.name" }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    ]);
    const total = Number(totalRows[0]?.total || 0);
    return res.json({ success: true, data: { summary: summaryRows[0] || { revealSessions: 0, uniqueViewers: 0, listings: 0 }, trend, topProducts, topListings, rows, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Failed to load rate-interest analytics." });
  }
});

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
