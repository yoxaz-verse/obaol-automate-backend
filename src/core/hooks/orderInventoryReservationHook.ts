import { ExecutionMode } from "../types";
import { InventoryReservationModel } from "../../database/models/inventoryReservation";
import { InventoryModel } from "../../database/models/inventory";
import { notificationService } from "../../services/notificationService";
import { operationalNotificationService } from "../../services/operationalNotificationService";
import { NotificationEntityTypes, NotificationTypes } from "../../constants/notificationTypes";

export const orderInventoryReservationHook = async (
    entityName: string,
    result: any,
    mode: ExecutionMode,
    req?: any
) => {
    if (entityName !== "orders") return;
    if (mode !== ExecutionMode.UPDATE || !result?._id) return;

    const dispatchDate = result?.milestones?.transportDispatchDate;
    if (!dispatchDate) return;

    const reservations = await InventoryReservationModel.find({
        orderId: result._id,
        status: "RESERVED",
        isDeleted: { $ne: true },
    }).lean();

    if (!reservations.length) return;

    const now = new Date();
    await InventoryReservationModel.updateMany(
        { _id: { $in: reservations.map((r) => r._id) } },
        { $set: { status: "CONSUMED", consumedAt: now } }
    );

    await Promise.all(
        reservations.map(async (reservation) => {
            const beforeInventory = await InventoryModel.findById(reservation.inventoryId).lean();
            const updatedInventory = await InventoryModel.findByIdAndUpdate(
                reservation.inventoryId,
                { $inc: { quantity: -Number(reservation.quantity || 0) } },
                { new: true }
            ).lean();

            const recipients = await notificationService.buildInventoryRecipients(updatedInventory || reservation);
            await operationalNotificationService.dispatch({
                recipientMap: recipients,
                actorId: req?.user?.id || null,
                type: NotificationTypes.INVENTORY_CONSUMED,
                title: "Inventory consumed",
                message: `Inventory quantity ${Number(reservation.quantity || 0)} MT has been consumed for dispatch.`,
                entityType: NotificationEntityTypes.INVENTORY,
                entityId: reservation.inventoryId,
                route: "/dashboard/inventory",
                payload: {
                    inventoryReservationId: reservation._id,
                    inventoryId: reservation.inventoryId,
                    orderId: result._id,
                    consumedQuantity: Number(reservation.quantity || 0),
                },
                priority: "high",
                moduleLabel: "Inventory",
                reference: String(reservation._id || ""),
            });

            const prevQty = Number((beforeInventory as any)?.quantity || 0);
            const nextQty = Number((updatedInventory as any)?.quantity || 0);
            const threshold = prevQty * 0.2;
            if (prevQty > 0 && prevQty > threshold && nextQty <= threshold) {
                await operationalNotificationService.dispatch({
                    recipientMap: recipients,
                    actorId: req?.user?.id || null,
                    type: NotificationTypes.INVENTORY_LOW_STOCK,
                    title: "Inventory low stock",
                    message: `Inventory stock has dropped to ${nextQty} ${(updatedInventory as any)?.unit || "MT"}.`,
                    entityType: NotificationEntityTypes.INVENTORY,
                    entityId: reservation.inventoryId,
                    route: "/dashboard/inventory",
                    payload: {
                        inventoryId: reservation.inventoryId,
                        orderId: result._id,
                        previousQuantity: prevQty,
                        currentQuantity: nextQty,
                    },
                    priority: "high",
                    moduleLabel: "Inventory",
                    reference: String(reservation.inventoryId || ""),
                });
            }
        })
    );
};
