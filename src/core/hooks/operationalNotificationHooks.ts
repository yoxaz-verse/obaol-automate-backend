import { ExecutionMode, HookFunction } from "../types";
import { InventoryModel } from "../../database/models/inventory";
import { OrderModel } from "../../database/models/order";
import { notificationService } from "../../services/notificationService";
import { operationalNotificationService } from "../../services/operationalNotificationService";
import { NotificationEntityTypes, NotificationTypes } from "../../constants/notificationTypes";

type HookReq = {
  user?: { id?: string; role?: string };
  __notificationCtx?: Record<string, any>;
};

const hasOwn = (payload: any, key: string) => Object.prototype.hasOwnProperty.call(payload || {}, key);

const valuesDiffer = (a: any, b: any) => {
  const left = a instanceof Date ? a.toISOString() : String(a ?? "");
  const right = b instanceof Date ? b.toISOString() : String(b ?? "");
  return left !== right;
};

const changedMilestoneKeys = (previous: any, next: any, patch: any) => {
  if (!patch || typeof patch !== "object") return [];
  return Object.keys(patch).filter((key) => valuesDiffer(previous?.[key], next?.[key]));
};

export const inventoryNotificationPreWriteHook: HookFunction = async (payload, mode, id, req?: HookReq) => {
  if (mode !== ExecutionMode.UPDATE || !id || !req) return payload;
  const previous = await InventoryModel.findById(id).select("_id quantity associate associateCompany warehouseName").lean();
  req.__notificationCtx = req.__notificationCtx || {};
  req.__notificationCtx.inventoryPrev = previous || null;
  return payload;
};

export const inventoryNotificationPostWriteHook = async (
  entityName: string,
  result: any,
  mode: ExecutionMode,
  req?: HookReq
) => {
  if (entityName !== "inventories" || !result?._id) return;

  if (mode === ExecutionMode.CREATE) {
    const recipients = await notificationService.buildInventoryRecipients(result);
    await operationalNotificationService.dispatch({
      recipientMap: recipients,
      actorId: req?.user?.id || null,
      type: NotificationTypes.INVENTORY_CREATED,
      title: "Inventory created",
      message: "A new inventory item has been added and is available for operational tracking.",
      entityType: NotificationEntityTypes.INVENTORY,
      entityId: result._id,
      route: "/dashboard/inventory",
      payload: { inventoryId: result._id },
      priority: "medium",
      moduleLabel: "Inventory",
      reference: String(result?.warehouseName || result?._id || ""),
    });
    return;
  }

  if (mode !== ExecutionMode.UPDATE || !hasOwn((req as any)?.body, "quantity")) return;
  const previous = req?.__notificationCtx?.inventoryPrev;
  const prevQty = Number(previous?.quantity || 0);
  const nextQty = Number(result?.quantity || 0);
  if (!(prevQty > 0) || Number.isNaN(nextQty)) return;

  const threshold = prevQty * 0.2;
  if (prevQty > threshold && nextQty <= threshold) {
    const recipients = await notificationService.buildInventoryRecipients(result);
    await operationalNotificationService.dispatch({
      recipientMap: recipients,
      actorId: req?.user?.id || null,
      type: NotificationTypes.INVENTORY_LOW_STOCK,
      title: "Inventory low stock",
      message: `Inventory stock has dropped to ${nextQty} ${result?.unit || "MT"}.`,
      entityType: NotificationEntityTypes.INVENTORY,
      entityId: result._id,
      route: "/dashboard/inventory",
      payload: { inventoryId: result._id, previousQuantity: prevQty, currentQuantity: nextQty },
      priority: "high",
      moduleLabel: "Inventory",
      reference: String(result?.warehouseName || result?._id || ""),
    });
  }
};

export const orderNotificationPreWriteHook: HookFunction = async (payload, mode, id, req?: HookReq) => {
  if (mode !== ExecutionMode.UPDATE || !id || !req) return payload;
  const previous = await OrderModel.findById(id)
    .select("_id enquiry status workflowStage milestones supplierOperatorId dealCloserOperatorId procurementOperatorId handlerOperatorId associateCompanyId")
    .populate("enquiry")
    .lean();
  req.__notificationCtx = req.__notificationCtx || {};
  req.__notificationCtx.orderPrev = previous || null;
  return payload;
};

export const orderNotificationPostWriteHook = async (
  entityName: string,
  result: any,
  mode: ExecutionMode,
  req?: HookReq
) => {
  if (entityName !== "orders" || !result?._id) return;

  if (mode === ExecutionMode.CREATE) {
    const recipients = await notificationService.buildOrderRecipients(result);
    await operationalNotificationService.dispatch({
      recipientMap: recipients,
      actorId: req?.user?.id || null,
      type: NotificationTypes.ORDER_CREATED,
      title: "Order created",
      message: "A trade order has been created and is ready for execution tracking.",
      entityType: NotificationEntityTypes.ORDER,
      entityId: result._id,
      route: `/dashboard/orders/${result._id}`,
      payload: { orderId: result._id, enquiryId: result?.enquiry || null },
      priority: "high",
      moduleLabel: "Orders",
      reference: String(result?.trackingId || result?._id || ""),
    });
    return;
  }

  if (mode !== ExecutionMode.UPDATE) return;
  const previous = req?.__notificationCtx?.orderPrev;
  if (!previous) return;
  const recipients = await notificationService.buildOrderRecipients(result);

  if (hasOwn((req as any)?.body, "workflowStage") && valuesDiffer(previous.workflowStage, result.workflowStage)) {
    await operationalNotificationService.dispatch({
      recipientMap: recipients,
      actorId: req?.user?.id || null,
      type: NotificationTypes.ORDER_STAGE_CHANGED,
      title: "Order stage changed",
      message: `Order workflow moved to ${String(result.workflowStage || "the next stage")}.`,
      entityType: NotificationEntityTypes.ORDER,
      entityId: result._id,
      route: `/dashboard/orders/${result._id}`,
      payload: { orderId: result._id, previousStage: previous.workflowStage, workflowStage: result.workflowStage },
      priority: "medium",
      moduleLabel: "Orders",
      reference: String(result?.trackingId || result?._id || ""),
    });
  }

  if (hasOwn((req as any)?.body, "status") && valuesDiffer(previous.status, result.status)) {
    await operationalNotificationService.dispatch({
      recipientMap: recipients,
      actorId: req?.user?.id || null,
      type: NotificationTypes.ORDER_STATUS_CHANGED,
      title: "Order status changed",
      message: `Order status changed to ${String(result.status || "updated")}.`,
      entityType: NotificationEntityTypes.ORDER,
      entityId: result._id,
      route: `/dashboard/orders/${result._id}`,
      payload: { orderId: result._id, previousStatus: previous.status, status: result.status },
      priority: "medium",
      moduleLabel: "Orders",
      reference: String(result?.trackingId || result?._id || ""),
    });
  }

  const milestoneKeys = changedMilestoneKeys(previous.milestones || {}, result.milestones || {}, (req as any)?.body?.milestones);
  if (milestoneKeys.length) {
    await operationalNotificationService.dispatch({
      recipientMap: recipients,
      actorId: req?.user?.id || null,
      type: NotificationTypes.ORDER_MILESTONE_UPDATED,
      title: "Order milestone updated",
      message: `Order milestone updated: ${milestoneKeys.join(", ")}.`,
      entityType: NotificationEntityTypes.ORDER,
      entityId: result._id,
      route: `/dashboard/orders/${result._id}`,
      payload: { orderId: result._id, milestoneKeys },
      priority: "medium",
      moduleLabel: "Orders",
      reference: String(result?.trackingId || result?._id || ""),
    });
  }
};
