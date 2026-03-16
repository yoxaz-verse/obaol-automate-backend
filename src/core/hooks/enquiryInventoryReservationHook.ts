import { ExecutionMode } from "../types";
import { InventoryReservationModel } from "../../database/models/inventoryReservation";

export const enquiryInventoryReservationHook = async (
    entityName: string,
    result: any,
    mode: ExecutionMode
) => {
    if (entityName !== "enquiries") return;
    if (mode !== ExecutionMode.UPDATE || !result?._id) return;

    const status = String(result?.status || "").toUpperCase();
    if (status !== "CANCELLED") return;

    await InventoryReservationModel.updateMany(
        {
            enquiryId: result._id,
            status: "RESERVED",
            isDeleted: { $ne: true },
        },
        {
            $set: { status: "RELEASED", releasedAt: new Date() },
        }
    );
};
