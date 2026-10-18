import { Request, Response } from "express";
import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { ProductBiddingEventModel } from "../database/models/productBiddingEvent";
import { ProductBidOfferModel } from "../database/models/productBidOffer";
import { VariantRateModel } from "../database/models/variantRate";
import { InquiryModel } from "../database/models/enquiry";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { InquiryStatus } from "../core/inquiry/inquiryStateMachine";
import { matchesSellerBiddingView, synchronizeAllProductBiddingLifecycles, synchronizeProductBiddingLifecycle } from "../services/productBiddingService";
import { notificationService } from "../services/notificationService";

const idOf = (value: any) => String(value?._id || value || "");
const isId = (value: any) => mongoose.Types.ObjectId.isValid(String(value || ""));
const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });
const roleOf = (req: Request) => String(req.user?.role || "").toLowerCase();
const elevated = (req: Request) => ["admin", "operator", "team"].includes(roleOf(req));
const canManageEvent = async (req: Request, event: any, companyId?: string) => {
  if (roleOf(req) === "admin") return true;
  if (roleOf(req) === "associate") return idOf(event.buyerCompany) === companyId;
  if (["operator", "team"].includes(roleOf(req))) return Boolean(await AssociateCompanyModel.exists({ _id: event.buyerCompany, assignedOperator: req.user?.id }));
  return false;
};

const actor = async (req: Request) => {
  if (roleOf(req) !== "associate") return { id: String(req.user?.id || ""), companyId: String(req.user?.associateCompany || "") };
  const associate: any = await AssociateModel.findById(req.user?.id).select("associateCompany registrationStatus isActive isDeleted").lean();
  if (!associate || associate.isDeleted || !associate.isActive || associate.registrationStatus !== "APPROVED") return null;
  return { id: idOf(associate), companyId: idOf(associate.associateCompany) };
};

const eventFields = ["title", "product", "productVariant", "quantity", "unit", "specifications", "deliveryLocation", "deliveryDate", "buyerNotes"];
const payloadFrom = (body: any) => Object.fromEntries(eventFields.filter((key) => body?.[key] !== undefined).map((key) => [key, body[key]]));

const validateSchedule = (opensAt: any, closesAt: any) => {
  const open = new Date(opensAt);
  const close = new Date(closesAt);
  if (!opensAt || !closesAt || Number.isNaN(open.getTime()) || Number.isNaN(close.getTime())) return "Valid opening and closing times are required.";
  if (close <= open) return "Closing time must be after opening time.";
  if (close <= new Date()) return "Closing time must be in the future.";
  return null;
};

const notifyAssociates = async (ids: any[], event: any, type: string, title: string, body: string, actorId?: string, route = "/dashboard/bidding") => {
  const recipientMap = new Map<string, "Associate">();
  ids.map(idOf).filter((id) => isId(id) && id !== String(actorId || "")).forEach((id) => recipientMap.set(id, "Associate"));
  if (!recipientMap.size) return;
  await notificationService.createNotifications({ recipientMap, createdByUserId: actorId || null, type, title, message: body, entityType: "SYSTEM", entityId: event._id, route, payload: { biddingEventId: idOf(event) } });
};

const baseEvent = (event: any, offerCount = 0) => ({
  _id: idOf(event), title: event.title, product: event.product, productVariant: event.productVariant,
  quantity: event.quantity, unit: event.unit, specifications: event.specifications,
  deliveryLocation: event.deliveryLocation, deliveryDate: event.deliveryDate, buyerNotes: event.buyerNotes,
  opensAt: event.opensAt, closesAt: event.closesAt, status: event.status,
  offerCount, createdAt: event.createdAt, updatedAt: event.updatedAt,
  winningOffer: event.winningOffer ? idOf(event.winningOffer) : null,
  draftEnquiry: event.draftEnquiry ? idOf(event.draftEnquiry) : null,
});

export class ProductBiddingController {
  async create(req: Request, res: Response) {
    const who = await actor(req);
    if (!who?.companyId || roleOf(req) !== "associate") return fail(res, 403, "An approved buyer company is required.");
    const input = payloadFrom(req.body);
    if (!input.title || !isId(input.product) || !(Number(input.quantity) > 0) || !["KG", "MT", "Quintal"].includes(String(input.unit))) return fail(res, 400, "Title, product, quantity, and unit are required.");
    const event = await ProductBiddingEventModel.create({ ...input, buyer: who.id, buyerCompany: who.companyId, status: "DRAFT" });
    return res.status(201).json({ success: true, data: baseEvent(event) });
  }

  async update(req: Request, res: Response) {
    const who = await actor(req);
    const event: any = await ProductBiddingEventModel.findById(req.params.id);
    if (!event) return fail(res, 404, "Bidding event not found.");
    if (!await canManageEvent(req, event, who?.companyId)) return fail(res, 403, "Forbidden.");
    if (event.status !== "DRAFT") return fail(res, 409, "Only draft bidding events can be edited.");
    Object.assign(event, payloadFrom(req.body));
    await event.save();
    return res.json({ success: true, data: baseEvent(event) });
  }

  async publish(req: Request, res: Response) {
    const who = await actor(req);
    const event: any = await ProductBiddingEventModel.findById(req.params.id);
    if (!event) return fail(res, 404, "Bidding event not found.");
    if (!await canManageEvent(req, event, who?.companyId)) return fail(res, 403, "Forbidden.");
    if (event.status !== "DRAFT") return fail(res, 409, "Only a draft can be scheduled.");
    const scheduleError = validateSchedule(req.body?.opensAt, req.body?.closesAt);
    if (scheduleError) return fail(res, 400, scheduleError);
    event.opensAt = new Date(req.body.opensAt); event.closesAt = new Date(req.body.closesAt);
    event.status = event.opensAt <= new Date() ? "OPEN" : "SCHEDULED";
    await event.save();
    return res.json({ success: true, data: baseEvent(event) });
  }

  async cancel(req: Request, res: Response) {
    const who = await actor(req);
    const event: any = await ProductBiddingEventModel.findById(req.params.id);
    if (!event) return fail(res, 404, "Bidding event not found.");
    if (!await canManageEvent(req, event, who?.companyId)) return fail(res, 403, "Forbidden.");
    await synchronizeProductBiddingLifecycle(event);
    if (["AWARDED", "CANCELLED"].includes(event.status)) return fail(res, 409, "This event can no longer be cancelled.");
    event.status = "CANCELLED"; event.cancelledAt = new Date(); event.cancelledBy = who?.id || req.user?.id; event.cancellationReason = String(req.body?.reason || "");
    await event.save();
    const sellers = await ProductBidOfferModel.find({ event: event._id }).distinct("seller");
    await notifyAssociates(sellers, event, "PRODUCT_BIDDING_CANCELLED", "Bidding event cancelled", `${event.title} has been cancelled.`, who?.id);
    return res.json({ success: true, data: baseEvent(event) });
  }

  async close(req: Request, res: Response) {
    const who = await actor(req);
    const event: any = await ProductBiddingEventModel.findById(req.params.id);
    if (!event) return fail(res, 404, "Bidding event not found.");
    if (!await canManageEvent(req, event, who?.companyId)) return fail(res, 403, "Forbidden.");
    await synchronizeProductBiddingLifecycle(event);
    if (event.status === "CLOSED") return res.json({ success: true, data: baseEvent(event) });
    if (event.status !== "OPEN") return fail(res, 409, "Only an open bidding event can be closed.");
    event.status = "CLOSED"; event.closesAt = new Date(); await event.save();
    const sellers = await ProductBidOfferModel.find({ event: event._id }).distinct("seller");
    await notifyAssociates(sellers, event, "PRODUCT_BIDDING_CLOSED", "Bidding closed", `${event.title} is now closed.`, who?.id);
    return res.json({ success: true, data: baseEvent(event) });
  }

  async list(req: Request, res: Response) {
    await synchronizeAllProductBiddingLifecycles();
    const who = await actor(req);
    if (!who && !elevated(req)) return fail(res, 403, "Forbidden.");
    const mode = String(req.query.mode || "buyer");
    const sellerView = String(req.query.view || "available").toLowerCase();
    if (mode === "seller" && !["available", "participating", "history"].includes(sellerView)) return fail(res, 400, "Seller view must be available, participating, or history.");
    const filter: any = {};
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();
    if (["operator", "team"].includes(roleOf(req))) {
      const scoped = await AssociateCompanyModel.find({ assignedOperator: req.user?.id }).distinct("_id");
      filter.buyerCompany = { $in: scoped };
    } else if (!elevated(req)) {
      if (mode === "buyer") filter.buyerCompany = who!.companyId;
      else {
        filter.status = filter.status || { $in: ["OPEN", "CLOSED", "AWARDED"] };
        filter.buyerCompany = { $ne: who!.companyId };
      }
    }
    let events: any[] = await ProductBiddingEventModel.find(filter).populate("product", "name").populate("productVariant", "name").sort({ createdAt: -1 }).limit(200).lean();
    const ids = events.map((event) => event._id);
    const offers: any[] = await ProductBidOfferModel.find({ event: { $in: ids } }).populate({ path: "listing", populate: { path: "productVariant", select: "name product", populate: { path: "product", select: "name" } } }).populate("sellerCompany", "name").lean();
    const byEvent = new Map<string, any[]>();
    offers.forEach((offer) => byEvent.set(idOf(offer.event), [...(byEvent.get(idOf(offer.event)) || []), offer]));
    if (mode === "seller" && roleOf(req) === "associate") {
      let eligibleListingKeys = new Set<string>();
      if (sellerView === "available") {
        const listings: any[] = await VariantRateModel.find({ associateCompany: who!.companyId, isDeleted: { $ne: true }, approvalStatus: "APPROVED" }).populate({ path: "productVariant", select: "product" }).lean();
        eligibleListingKeys = new Set(listings.flatMap((listing) => [`product:${idOf(listing.productVariant?.product)}`, `variant:${idOf(listing.productVariant)}`]).filter((key) => !key.endsWith(":")));
      }
      events = events.filter((event) => matchesSellerBiddingView(event, byEvent.get(idOf(event)) || [], who!.companyId, sellerView, eligibleListingKeys));
    }
    const data = events.map((event) => {
      const rows = byEvent.get(idOf(event)) || [];
      const base: any = baseEvent(event, rows.filter((row) => row.status !== "WITHDRAWN").length);
      const owns = idOf(event.buyerCompany) === who?.companyId;
      if (mode !== "buyer" && who?.companyId) base.ownOffer = rows.find((row) => idOf(row.sellerCompany) === who.companyId) || null;
      if ((owns || elevated(req)) && ["CLOSED", "AWARDED"].includes(event.status)) base.offers = rows;
      return base;
    });
    return res.json({ success: true, data });
  }

  async submitOffer(req: Request, res: Response) {
    const who = await actor(req);
    if (!who?.companyId || roleOf(req) !== "associate") return fail(res, 403, "An approved seller company is required.");
    const event: any = await ProductBiddingEventModel.findById(req.params.id);
    if (!event) return fail(res, 404, "Bidding event not found.");
    await synchronizeProductBiddingLifecycle(event);
    if (event.status !== "OPEN") return fail(res, 409, "Bidding is not open.");
    if (idOf(event.buyerCompany) === who.companyId) return fail(res, 409, "The buyer company cannot bid on its own event.");
    const listing: any = await VariantRateModel.findById(req.body?.listing).populate({ path: "productVariant", select: "product" }).lean();
    if (!listing || listing.isDeleted || String(listing.approvalStatus || "APPROVED") !== "APPROVED") return fail(res, 400, "Select an approved trade listing.");
    if (idOf(listing.associateCompany) !== who.companyId) return fail(res, 403, "You can only bid with your company’s listing.");
    if (idOf(listing.productVariant?.product) !== idOf(event.product)) return fail(res, 400, "The selected listing does not match this product.");
    if (event.productVariant && idOf(listing.productVariant) !== idOf(event.productVariant)) return fail(res, 400, "The selected listing does not match the requested variant.");
    const unitPrice = Number(req.body?.unitPrice), offeredQuantity = Number(req.body?.offeredQuantity);
    if (!(unitPrice > 0) || !(offeredQuantity > 0) || !["KG", "MT", "Quintal"].includes(String(req.body?.unit))) return fail(res, 400, "A valid price, quantity, and unit are required.");
    const existing: any = await ProductBidOfferModel.findOne({ event: event._id, sellerCompany: who.companyId });
    const next = { listing: listing._id, unitPrice, offeredQuantity, unit: req.body.unit, validUntil: req.body.validUntil || null, note: String(req.body.note || ""), status: "SUBMITTED" };
    let offer: any;
    if (existing) {
      existing.revisions.push({ unitPrice: existing.unitPrice, listing: existing.listing, offeredQuantity: existing.offeredQuantity, unit: existing.unit, validUntil: existing.validUntil, note: existing.note, revisedAt: new Date(), revisedBy: who.id });
      Object.assign(existing, next); offer = await existing.save();
    } else offer = await ProductBidOfferModel.create({ ...next, event: event._id, seller: who.id, sellerCompany: who.companyId });
    await notifyAssociates([event.buyer], event, existing ? "PRODUCT_BID_UPDATED" : "PRODUCT_BID_SUBMITTED", existing ? "Sealed offer updated" : "Sealed offer received", `A confidential offer was ${existing ? "updated" : "submitted"} for ${event.title}.`, who.id, "/dashboard/bidding/my");
    return res.status(existing ? 200 : 201).json({ success: true, data: offer });
  }

  async withdrawOffer(req: Request, res: Response) {
    const who = await actor(req);
    const event: any = await ProductBiddingEventModel.findById(req.params.id);
    if (!event) return fail(res, 404, "Bidding event not found.");
    await synchronizeProductBiddingLifecycle(event);
    if (event.status !== "OPEN") return fail(res, 409, "Offers can only be withdrawn while bidding is open.");
    const offer: any = await ProductBidOfferModel.findOne({ event: event._id, sellerCompany: who?.companyId });
    if (!offer) return fail(res, 404, "Offer not found.");
    offer.status = "WITHDRAWN"; await offer.save();
    return res.json({ success: true, data: offer });
  }

  async award(req: Request, res: Response) {
    const who = await actor(req);
    const event: any = await ProductBiddingEventModel.findById(req.params.id);
    if (!event) return fail(res, 404, "Bidding event not found.");
    if (!await canManageEvent(req, event, who?.companyId)) return fail(res, 403, "Forbidden.");
    await synchronizeProductBiddingLifecycle(event);
    if (event.status === "AWARDED") return res.json({ success: true, data: baseEvent(event) });
    if (event.status !== "CLOSED") return fail(res, 409, "The event must be closed before awarding a winner.");
    const offer: any = await ProductBidOfferModel.findOne({ _id: req.body?.offerId, event: event._id, status: "SUBMITTED" }).populate("listing");
    if (!offer) return fail(res, 400, "Select a valid submitted offer.");
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const enquiry: any = await InquiryModel.create([{
          productId: event.product, sourceProductVariantId: event.productVariant || offer.listing?.productVariant,
          quantity: event.quantity, specifications: event.specifications, variantRateId: offer.listing,
          buyerAssociateId: event.buyer, sellerAssociateId: offer.seller, status: InquiryStatus.DRAFT,
          biddingEventId: event._id, biddingOfferId: offer._id, biddingUnitPrice: offer.unitPrice,
        }], { session });
        await ProductBidOfferModel.updateMany({ event: event._id }, [{ $set: { status: { $cond: [{ $eq: ["$_id", offer._id] }, "AWARDED", { $cond: [{ $eq: ["$status", "WITHDRAWN"] }, "WITHDRAWN", "NOT_SELECTED"] }] } } }], { session });
        event.status = "AWARDED"; event.winningOffer = offer._id; event.draftEnquiry = enquiry[0]._id;
        await event.save({ session });
      });
    } finally { await session.endSession(); }
    const allOffers: any[] = await ProductBidOfferModel.find({ event: event._id }).select("seller status").lean();
    await notifyAssociates(allOffers.map((row) => row.seller), event, "PRODUCT_BIDDING_AWARDED", "Bidding result available", `${event.title} has been awarded.`, who?.id);
    await notifyAssociates([event.buyer], event, "PRODUCT_BIDDING_ENQUIRY_READY", "Draft enquiry ready", `Review and confirm the draft enquiry for ${event.title}.`, undefined, "/dashboard/bidding/my");
    return res.json({ success: true, data: baseEvent(event) });
  }

  async confirmEnquiry(req: Request, res: Response) {
    const who = await actor(req);
    const event: any = await ProductBiddingEventModel.findById(req.params.id);
    if (!event) return fail(res, 404, "Bidding event not found.");
    if (!await canManageEvent(req, event, who?.companyId)) return fail(res, 403, "Forbidden.");
    if (event.status !== "AWARDED" || !event.draftEnquiry) return fail(res, 409, "No awarded draft enquiry is available.");
    const enquiry: any = await InquiryModel.findById(event.draftEnquiry);
    if (!enquiry) return fail(res, 404, "Draft enquiry not found.");
    if (enquiry.status === InquiryStatus.NEW) return res.json({ success: true, data: enquiry });
    if (enquiry.status !== InquiryStatus.DRAFT) return fail(res, 409, "This enquiry is no longer a draft.");
    enquiry.status = InquiryStatus.NEW;
    await enquiry.save();
    await notifyAssociates([enquiry.sellerAssociateId], event, "PRODUCT_BIDDING_ENQUIRY_CONFIRMED", "Winning enquiry confirmed", `The buyer confirmed the enquiry for ${event.title}.`, who?.id);
    return res.json({ success: true, data: enquiry });
  }
}

export const productBiddingController = new ProductBiddingController();
