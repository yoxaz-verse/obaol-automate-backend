import mongoose from "mongoose";
import { ExecutionMode } from "../types";
import { VariantRateModel } from "../../database/models/variantRate";
import { notificationService } from "../../services/notificationService";
import { NotificationEntityTypes, NotificationTypes } from "../../constants/notificationTypes";

type HookReq = {
  body?: any;
  user?: { id?: string };
  __notificationCtx?: Record<string, any>;
};

export const variantRateLivePreWriteHook = async (
  payload: any,
  mode: ExecutionMode,
  id?: string,
  req?: HookReq
) => {
  if (mode !== ExecutionMode.UPDATE || !id || !req) return payload;
  if (!Object.prototype.hasOwnProperty.call(payload || {}, "isLive")) return payload;
  if (!mongoose.Types.ObjectId.isValid(id)) return payload;

  const existing = await VariantRateModel.findById(id)
    .select("_id isLive associate associateCompany productVariant")
    .lean();
  req.__notificationCtx = req.__notificationCtx || {};
  req.__notificationCtx.variantRatePrev = existing || null;
  return payload;
};

export const variantRateNotificationPostWriteHook = async (
  entityName: string,
  data: any,
  mode: ExecutionMode,
  req?: HookReq
) => {
  if (entityName !== "variant-rates") return;
  if (!data) return;

  const isLiveNow = Boolean((data as any).isLive);
  const prevLive = Boolean(req?.__notificationCtx?.variantRatePrev?.isLive);
  const becameLive = mode === ExecutionMode.UPDATE ? (!prevLive && isLiveNow) : isLiveNow;
  if (!becameLive) return;

  const recipients = await notificationService.buildVariantRateLiveRecipients(data);
  notificationService.removeActor(recipients, req?.user?.id || null);

  const rateId = String((data as any)._id || "");
  await notificationService.createNotifications({
    recipientMap: recipients,
    createdByUserId: req?.user?.id || null,
    type: NotificationTypes.VARIANT_RATE_LIVE,
    title: "Product rate is now live",
    message: "A variant rate has been made live and is now visible in trade flow.",
    entityType: NotificationEntityTypes.VARIANT_RATE,
    entityId: rateId,
    route: "/dashboard/product",
    payload: { variantRateId: rateId },
    priority: "medium",
  });
};

