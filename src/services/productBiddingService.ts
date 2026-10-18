import { ProductBiddingEventModel } from "../database/models/productBiddingEvent";
import { ProductBidOfferModel } from "../database/models/productBidOffer";
import { VariantRateModel } from "../database/models/variantRate";
import { ProductVariantModel } from "../database/models/productVariant";
import { notificationService } from "./notificationService";

const notify = async (recipientIds: any[], event: any, type: string, title: string, message: string) => {
  const recipientMap = new Map<string, "Associate">();
  recipientIds.map((value) => String(value?._id || value || "")).filter(Boolean).forEach((id) => recipientMap.set(id, "Associate"));
  if (!recipientMap.size) return;
  await notificationService.createNotifications({ recipientMap, type, title, message, entityType: "SYSTEM", entityId: event._id, route: "/dashboard/bidding", payload: { biddingEventId: String(event._id) } });
};

export const resolveProductBiddingStatus = (status: string, opensAt: Date | string | null, closesAt: Date | string | null, now = new Date()) => {
  if (["DRAFT", "AWARDED", "CANCELLED"].includes(status)) return status;
  const open = opensAt ? new Date(opensAt) : null;
  const close = closesAt ? new Date(closesAt) : null;
  if (close && close <= now) return "CLOSED";
  if (open && open <= now) return "OPEN";
  return open ? "SCHEDULED" : status;
};

export const synchronizeProductBiddingLifecycle = async (eventOrId: any, now = new Date()) => {
  const event: any = typeof eventOrId === "string" ? await ProductBiddingEventModel.findById(eventOrId) : eventOrId;
  if (!event || ["DRAFT", "AWARDED", "CANCELLED"].includes(String(event.status))) return event;
  const next = resolveProductBiddingStatus(String(event.status), event.opensAt, event.closesAt, now);
  if (next !== event.status) {
    event.status = next;
    await event.save();
  }
  return event;
};

export const synchronizeAllProductBiddingLifecycles = async (now = new Date()) => {
  const opening: any[] = await ProductBiddingEventModel.find({ status: "SCHEDULED", opensAt: { $lte: now }, closesAt: { $gt: now }, openedNotifiedAt: null }).lean();
  for (const event of opening) {
    const claimed = await ProductBiddingEventModel.findOneAndUpdate({ _id: event._id, openedNotifiedAt: null }, { $set: { openedNotifiedAt: now } });
    if (!claimed) continue;
    const variantIds = event.productVariant ? [event.productVariant] : await ProductVariantModel.find({ product: event.product }).distinct("_id");
    const sellers = await VariantRateModel.find({ productVariant: { $in: variantIds }, isDeleted: { $ne: true }, approvalStatus: "APPROVED" }).distinct("associate");
    await notify(sellers, event, "PRODUCT_BIDDING_OPENED", "New product bidding opportunity", `${event.title} is now open for sealed offers.`);
  }

  const closingSoon: any[] = await ProductBiddingEventModel.find({ status: "OPEN", closesAt: { $gt: now, $lte: new Date(now.getTime() + 60 * 60 * 1000) }, closingSoonNotifiedAt: null }).lean();
  for (const event of closingSoon) {
    const claimed = await ProductBiddingEventModel.findOneAndUpdate({ _id: event._id, closingSoonNotifiedAt: null }, { $set: { closingSoonNotifiedAt: now } });
    if (!claimed) continue;
    const sellers = await ProductBidOfferModel.find({ event: event._id, status: "SUBMITTED" }).distinct("seller");
    await notify([event.buyer, ...sellers], event, "PRODUCT_BIDDING_CLOSING_SOON", "Bidding closes soon", `${event.title} closes within one hour.`);
  }

  const closing: any[] = await ProductBiddingEventModel.find({ status: { $in: ["SCHEDULED", "OPEN"] }, closesAt: { $lte: now }, closedNotifiedAt: null }).lean();
  await ProductBiddingEventModel.updateMany({ status: "SCHEDULED", opensAt: { $lte: now }, closesAt: { $gt: now } }, { $set: { status: "OPEN" } });
  await ProductBiddingEventModel.updateMany({ status: { $in: ["SCHEDULED", "OPEN"] }, closesAt: { $lte: now } }, { $set: { status: "CLOSED" } });
  for (const event of closing) {
    const claimed = await ProductBiddingEventModel.findOneAndUpdate({ _id: event._id, closedNotifiedAt: null }, { $set: { closedNotifiedAt: now } });
    if (!claimed) continue;
    const sellers = await ProductBidOfferModel.find({ event: event._id }).distinct("seller");
    await notify([event.buyer, ...sellers], event, "PRODUCT_BIDDING_CLOSED", "Bidding closed", `${event.title} is now closed.`);
  }
};
