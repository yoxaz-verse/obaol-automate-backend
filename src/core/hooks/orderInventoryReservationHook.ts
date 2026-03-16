import { ExecutionMode } from "../types";
import { InventoryReservationModel } from "../../database/models/inventoryReservation";
import { InventoryModel } from "../../database/models/inventory";

export const orderInventoryReservationHook = async (
    entityName: string,
    result: any,
    mode: ExecutionMode
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
        reservations.map((reservation) =>
            InventoryModel.findByIdAndUpdate(
                reservation.inventoryId,
                { $inc: { quantity: -Number(reservation.quantity || 0) } },
                { new: false }
            )
        )
    );
};
