import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { VariantRateModel } from "../database/models/variantRate";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";
import { RateRevealEventModel } from "../database/models/rateRevealEvent";
import { ListingInteractionEventModel, LISTING_INTERACTION_TYPES } from "../database/models/listingInteractionEvent";

const objectId = (value: string) => mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
const day = (date: Date) => date.toISOString().slice(0, 10);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalize = (value: unknown) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(powders?|whole|fresh|dried)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (value: unknown) => new Set(normalize(value).split(" ").filter(Boolean));
const similarity = (a: unknown, b: unknown) => {
  const left = tokens(a); const right = tokens(b);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return (2 * overlap) / (left.size + right.size);
};

function dateRange(req: Request) {
  const now = new Date();
  const to = req.query.to ? new Date(String(req.query.to)) : now;
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(to.getTime() - 29 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw Object.assign(new Error("Invalid date range."), { status: 400 });
  if (to.getTime() - from.getTime() > 366 * 86400000) throw Object.assign(new Error("Date range cannot exceed 366 days."), { status: 400 });
  to.setUTCHours(23, 59, 59, 999); from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

async function listingContext(id: string) {
  const listingId = objectId(id);
  if (!listingId) return null;
  return VariantRateModel.findOne({ _id: listingId, isDeleted: { $ne: true } })
    .populate({ path: "productVariant", populate: { path: "product", populate: { path: "subCategory", populate: { path: "category" } } } })
    .populate("associate", "name email")
    .populate("associateCompany", "name")
    .populate("state", "name")
    .populate("district", "name")
    .lean();
}

const classification = (row: any) => ["isConventional", "isNatural", "isOrganic", "isIpmQuality", "isOrganicCertified", "isGiTagged"].filter((key) => Boolean(row?.[key]));
const variantSignature = (row: any) => `${normalize(row?.productVariant?.name)}|${classification(row).sort().join("|")}`;

export async function recordListingInteraction(req: Request, res: Response, next: NextFunction) {
  try {
    const type = String(req.body?.type || "");
    const sessionId = String(req.body?.sessionId || "").trim();
    if (!(LISTING_INTERACTION_TYPES as readonly string[]).includes(type) || !sessionId || sessionId.length > 120) return res.status(400).json({ success: false, message: "A valid interaction type and session are required." });
    const listing: any = await listingContext(req.params.listingId);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
    const variant: any = listing.productVariant;
    const product: any = variant?.product;
    const identity = String((req.user as any)?.id || req.ip || req.headers["user-agent"] || "anonymous");
    const secret = process.env.ANALYTICS_HASH_SECRET || process.env.JWT_SECRET || "obaol-analytics";
    const visitorKey = crypto.createHmac("sha256", secret).update(identity).digest("hex");
    await ListingInteractionEventModel.updateOne(
      { variantRate: listing._id, type, visitorKey, sessionId },
      { $setOnInsert: { product: product?._id, productVariant: variant?._id, occurredAt: new Date() } },
      { upsert: true }
    );
    return res.status(202).json({ success: true });
  } catch (error) { next(error); }
}

export async function getProductAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const listing: any = await listingContext(req.params.listingId);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
    const { from, to } = dateRange(req);
    const variant: any = listing.productVariant; const product: any = variant?.product; const subCategory: any = product?.subCategory; const category: any = subCategory?.category;
    const inquiryMatch: any = { createdAt: { $gte: from, $lte: to }, $or: [{ variantRateId: listing._id }, { productId: product._id, sourceProductVariantId: variant._id }] };
    const eventMatch = { variantRate: listing._id, occurredAt: { $gte: from, $lte: to } };
    const revealMatch = { variantRate: listing._id, revealedAt: { $gte: from, $lte: to } };
    const [events, reveals, inquiries, firstEvent, firstReveal, totalCatalog, sameCategory, allVariants, competingListings] = await Promise.all([
      ListingInteractionEventModel.find(eventMatch).select("+visitorKey type occurredAt").lean(),
      RateRevealEventModel.find(revealMatch).select("viewerId revealedAt").lean(),
      InquiryModel.find(inquiryMatch).select("_id status createdAt sourceProductVariantId variantRateId").lean(),
      ListingInteractionEventModel.findOne({ variantRate: listing._id }).sort({ occurredAt: 1 }).select("occurredAt").lean(),
      RateRevealEventModel.findOne({ variantRate: listing._id }).sort({ revealedAt: 1 }).select("revealedAt").lean(),
      ProductModel.countDocuments({ isDeleted: { $ne: true } }),
      ProductModel.countDocuments({ isDeleted: { $ne: true }, subCategory: subCategory?._id }),
      ProductVariantModel.find({ isDeleted: { $ne: true } }).populate("product", "name subCategory").lean(),
      VariantRateModel.find({ _id: { $ne: listing._id }, isDeleted: { $ne: true } }).populate({ path: "productVariant", populate: { path: "product", select: "name subCategory" } }).populate("associateCompany", "name").lean(),
    ]);
    const inquiryIds = inquiries.map((row: any) => row._id);
    const orders = inquiryIds.length ? await OrderModel.find({ enquiry: { $in: inquiryIds } }).select("enquiry").lean() : [];
    const statusCounts: Record<string, number> = { new: 0, active: 0, completed: 0, cancelled: 0, draft: 0 };
    inquiries.forEach((row: any) => { const status = String(row.status); if (status === "NEW") statusCounts.new++; else if (["CONTACTED", "IN_DISCUSSION", "QUOTE_REQUIRED"].includes(status)) statusCounts.active++; else if (status === "CLOSED") statusCounts.completed++; else if (status === "CANCELLED") statusCounts.cancelled++; else statusCounts.draft++; });
    const uniqueVisitors = new Set(events.map((row: any) => row.visitorKey)).size;
    const exactVariants = allVariants.filter((row: any) => String(row.product?._id) === String(product._id) && normalize(row.name) === normalize(variant.name));
    const matches = competingListings.map((row: any) => {
      const candidateProduct: any = row.productVariant?.product;
      const exactProduct = String(candidateProduct?._id) === String(product._id) || (String(candidateProduct?.subCategory) === String(subCategory?._id) && normalize(candidateProduct?.name) === normalize(product.name));
      const score = String(candidateProduct?.subCategory) === String(subCategory?._id) ? similarity(candidateProduct?.name, product.name) : 0;
      return { row, exactProduct, exactVariant: exactProduct && variantSignature(row) === variantSignature(listing), score };
    }).filter((item) => item.exactProduct || item.score >= 0.6);
    const exactListings = matches.filter((item) => item.exactProduct);
    const exactVariantListings = matches.filter((item) => item.exactVariant);
    const similarSellerIds = new Set(matches.map((item: any) => String(item.row.associateCompany?._id || item.row.associateCompany)).filter(Boolean));
    const daily = new Map<string, any>();
    for (let cursor = new Date(from); cursor <= to; cursor = new Date(cursor.getTime() + 86400000)) daily.set(day(cursor), { date: day(cursor), clicks: 0, views: 0, reveals: 0, inquiries: 0 });
    events.forEach((row: any) => { const bucket = daily.get(day(row.occurredAt)); if (bucket) bucket[row.type === "LISTING_CLICK" ? "clicks" : "views"]++; });
    reveals.forEach((row: any) => { const bucket = daily.get(day(row.revealedAt)); if (bucket) bucket.reveals++; });
    inquiries.forEach((row: any) => { const bucket = daily.get(day(row.createdAt)); if (bucket) bucket.inquiries++; });
    const nonDraft = inquiries.filter((row: any) => row.status !== "DRAFT").length;
    const uniqueRevealViewers = new Set(reveals.map((row: any) => String(row.viewerId))).size;
    return res.json({ success: true, data: {
      overview: { listingId: listing._id, productId: product?._id, variantId: variant?._id, name: product?.name, variant: variant?.name, description: product?.description || variant?.description, imageUrl: product?.imageUrl || null, category: category?.name, subCategory: subCategory?.name, seller: listing.associateCompany?.name || listing.associate?.name, rate: listing.rate, commission: listing.commission, unit: listing.unit, isLive: listing.isLive, createdAt: listing.createdAt, updatedAt: listing.updatedAt, classifications: classification(listing).map((key) => key.replace(/^is/, "")) },
      performance: { clicks: events.filter((row: any) => row.type === "LISTING_CLICK").length, views: events.filter((row: any) => row.type === "DETAIL_VIEW").length, uniqueVisitors, reveals: reveals.length, uniqueRevealViewers, inquiries: inquiries.length, viewToInquiryRate: uniqueVisitors ? inquiries.length / uniqueVisitors : null, inquiryToOrderRate: nonDraft ? new Set(orders.map((row: any) => String(row.enquiry))).size / nonDraft : null },
      inquirySummary: { total: inquiries.length, statuses: statusCounts, convertedOrders: new Set(orders.map((row: any) => String(row.enquiry))).size },
      catalog: { totalProducts: totalCatalog, sameCategoryProducts: sameCategory, matchingProductListings: exactListings.length, matchingVariants: exactVariants.length, matchingVariantListings: exactVariantListings.length, similarSellers: similarSellerIds.size, uniqueProduct: exactListings.length === 0, uniqueVariant: exactVariantListings.length === 0 },
      trend: [...daily.values()],
      dataCoverage: { interactionsFrom: firstEvent?.occurredAt || null, revealsFrom: firstReveal?.revealedAt || null, inquiriesFrom: inquiries.length ? inquiries.reduce((min: Date, row: any) => row.createdAt < min ? row.createdAt : min, inquiries[0].createdAt) : null },
    } });
  } catch (error) { next(error); }
}

export async function getProductAnalyticsInquiries(req: Request, res: Response, next: NextFunction) {
  try {
    const listing: any = await listingContext(req.params.listingId); if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
    const { from, to } = dateRange(req); const page = Math.max(1, Number(req.query.page || 1)); const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const match: any = { createdAt: { $gte: from, $lte: to }, $or: [{ variantRateId: listing._id }, { productId: listing.productVariant.product._id, sourceProductVariantId: listing.productVariant._id }] };
    if (req.query.status) match.status = String(req.query.status);
    const [rows, total] = await Promise.all([InquiryModel.find(match).select("status quantity createdAt updatedAt variantRateId sourceProductVariantId").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), InquiryModel.countDocuments(match)]);
    return res.json({ success: true, data: { rows, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } } });
  } catch (error) { next(error); }
}

export async function getSimilarProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const listing: any = await listingContext(req.params.listingId); if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
    const page = Math.max(1, Number(req.query.page || 1)); const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const product: any = listing.productVariant.product; const rows: any[] = await VariantRateModel.find({ _id: { $ne: listing._id }, isDeleted: { $ne: true } }).populate({ path: "productVariant", populate: { path: "product", select: "name subCategory" } }).populate("associateCompany", "name").lean();
    const candidates = rows.map((row) => { const candidate: any = row.productVariant?.product; const exactProduct = String(candidate?._id) === String(product._id) || (String(candidate?.subCategory) === String(product.subCategory?._id) && normalize(candidate?.name) === normalize(product.name)); const score = String(candidate?.subCategory) === String(product.subCategory?._id) ? similarity(candidate?.name, product.name) : 0; return { id: row._id, product: candidate?.name, variant: row.productVariant?.name, seller: row.associateCompany?.name, rate: row.rate, isLive: row.isLive, matchType: exactProduct ? (variantSignature(row) === variantSignature(listing) ? "EXACT_VARIANT" : "EXACT_PRODUCT") : "SIMILAR", score }; }).filter((row) => row.matchType !== "SIMILAR" || row.score >= 0.6).sort((a, b) => b.score - a.score);
    const requested = String(req.query.matchType || ""); const filtered = requested ? candidates.filter((row) => row.matchType === requested) : candidates; const total = filtered.length;
    return res.json({ success: true, data: { rows: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } } });
  } catch (error) { next(error); }
}
