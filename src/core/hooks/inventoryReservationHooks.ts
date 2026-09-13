import { Types } from "mongoose";
import { ExecutionMode, HookFunction } from "../types";
import { InventoryReservationModel } from "../../database/models/inventoryReservation";
import { InventoryModel } from "../../database/models/inventory";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { AssociateModel } from "../../database/models/associate";
import { notificationService } from "../../services/notificationService";
import { operationalNotificationService } from "../../services/operationalNotificationService";
import { NotificationEntityTypes, NotificationTypes } from "../../constants/notificationTypes";

const EMPTY_QUERY = { _id: "000000000000000000000000" };

const mergeScopedCompanyQuery = (baseQuery: any, companyIds: Types.ObjectId[]) => {
    if (!companyIds.length) return EMPTY_QUERY;
    const scopedQuery = { ...(baseQuery || {}) };
    const explicitCompany = scopedQuery.associateCompany;

    if (explicitCompany) {
        if (typeof explicitCompany === "string") {
            return companyIds.some((id) => String(id) === String(explicitCompany))
                ? scopedQuery
                : EMPTY_QUERY;
        }
        if (explicitCompany && typeof explicitCompany === "object" && Array.isArray(explicitCompany.$in)) {
            const allowed = explicitCompany.$in.filter((candidate: any) =>
                companyIds.some((id) => String(id) === String(candidate))
            );
            if (!allowed.length) return EMPTY_QUERY;
            scopedQuery.associateCompany = { ...explicitCompany, $in: allowed };
            return scopedQuery;
        }
    }

    scopedQuery.associateCompany = { $in: companyIds };
    return scopedQuery;
};

export const inventoryReservationPreReadHook: HookFunction = async (query, _mode, _id, req) => {
    if (!req?.user) return query;
    const roleLower = String(req.user.role || "").toLowerCase();

    if (roleLower === "admin") {
        return { ...query, isDeleted: { $ne: true } };
    }

    if (roleLower === "operator" || roleLower === "team") {
        const assignedCompanies = await AssociateCompanyModel.find({ assignedOperator: req.user.id }).select("_id");
        const assignedIds = assignedCompanies.map((company) => company._id);
        return mergeScopedCompanyQuery(query, assignedIds);
    }

    if (roleLower === "associate") {
        const associate = await AssociateModel.findById(req.user.id).select("_id associateCompany").lean();
        const companyId = (associate as any)?.associateCompany;
        if (!companyId) return EMPTY_QUERY;
        return mergeScopedCompanyQuery(query, [companyId as Types.ObjectId]);
    }

    return query;
};

export const inventoryReservationPreWriteHook: HookFunction = async (payload, mode, _id, req) => {
    if (!req?.user) return payload;

    if (mode === ExecutionMode.CREATE) {
        const inventoryId = payload?.inventoryId;
        if (!inventoryId || !Types.ObjectId.isValid(String(inventoryId))) {
            throw new Error("Valid inventoryId is required to reserve stock.");
        }

        const enquiryId = payload?.enquiryId;
        if (!enquiryId || !Types.ObjectId.isValid(String(enquiryId))) {
            throw new Error("Valid enquiryId is required to reserve stock.");
        }

        const inventory = await InventoryModel.findById(inventoryId).lean();
        if (!inventory || (inventory as any).isDeleted) {
            throw new Error("Inventory not found for reservation.");
        }

        const quantity = Number(payload?.quantity);
        if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
            throw new Error("Reservation quantity must be greater than 0.");
        }

        const reservedAgg = await InventoryReservationModel.aggregate([
            { $match: { inventoryId: inventory._id, status: "RESERVED", isDeleted: { $ne: true } } },
            { $group: { _id: "$inventoryId", qty: { $sum: "$quantity" } } }
        ]);
        const reservedQty = reservedAgg?.[0]?.qty || 0;
        const availableQty = Math.max(0, Number((inventory as any).quantity || 0) - reservedQty);
        if (quantity > availableQty) {
            throw new Error(`Only ${availableQty} MT is available for reservation in this inventory.`);
        }

        const roleLower = String(req.user.role || "").toLowerCase();
        if (roleLower === "associate") {
            const associate = await AssociateModel.findById(req.user.id).select("_id associateCompany").lean();
            const companyId = (associate as any)?.associateCompany;
            if (!companyId) {
                throw new Error("Associate company is required to reserve inventory.");
            }
            const inventoryCompanyId = (inventory as any).associateCompany;
            if (String(companyId) !== String(inventoryCompanyId)) {
                throw new Error("You can only reserve inventory for your own company.");
            }
        }

        const nextPayload = { ...(payload || {}) };
        nextPayload.inventoryId = inventory._id;
        nextPayload.productVariant = nextPayload.productVariant || (inventory as any).productVariant;
        nextPayload.associateCompany = nextPayload.associateCompany || (inventory as any).associateCompany;
        nextPayload.status = "RESERVED";
        nextPayload.reservedAt = new Date();

        return nextPayload;
    }

    if (mode === ExecutionMode.UPDATE) {
        if (_id && Types.ObjectId.isValid(String(_id))) {
            const previous = await InventoryReservationModel.findById(_id)
                .select("_id status inventoryId orderId enquiryId associateCompany quantity")
                .lean();
            req.__notificationCtx = req.__notificationCtx || {};
            req.__notificationCtx.inventoryReservationPrev = previous || null;
        }
        const nextPayload = { ...(payload || {}) };
        if (nextPayload.status === "RELEASED") {
            nextPayload.releasedAt = new Date();
        }
        if (nextPayload.status === "CONSUMED") {
            nextPayload.consumedAt = new Date();
        }
        return nextPayload;
    }

    return payload;
};

export const inventoryReservationNotificationPostWriteHook = async (
    entityName: string,
    result: any,
    mode: ExecutionMode,
    req?: any
) => {
    if (entityName !== "inventory-reservations" || !result?._id) return;

    const previousStatus = String(req?.__notificationCtx?.inventoryReservationPrev?.status || "").toUpperCase();
    const currentStatus = String(result?.status || "").toUpperCase();
    if (!currentStatus) return;
    if (mode === ExecutionMode.UPDATE && previousStatus === currentStatus) return;
    if (mode !== ExecutionMode.CREATE && mode !== ExecutionMode.UPDATE) return;

    const typeByStatus: Record<string, string> = {
        RESERVED: NotificationTypes.INVENTORY_RESERVED,
        RELEASED: NotificationTypes.INVENTORY_RELEASED,
        CONSUMED: NotificationTypes.INVENTORY_CONSUMED,
    };
    const titleByStatus: Record<string, string> = {
        RESERVED: "Inventory reserved",
        RELEASED: "Inventory released",
        CONSUMED: "Inventory consumed",
    };
    const messageByStatus: Record<string, string> = {
        RESERVED: `Inventory quantity ${Number(result?.quantity || 0)} ${result?.unit || "MT"} has been reserved for an inquiry.`,
        RELEASED: `Reserved inventory quantity ${Number(result?.quantity || 0)} ${result?.unit || "MT"} has been released.`,
        CONSUMED: `Reserved inventory quantity ${Number(result?.quantity || 0)} ${result?.unit || "MT"} has been consumed for an order.`,
    };

    const notificationType = typeByStatus[currentStatus];
    if (!notificationType) return;

    const recipients = await notificationService.buildInventoryRecipients(result);
    await operationalNotificationService.dispatch({
        recipientMap: recipients,
        actorId: req?.user?.id || null,
        type: notificationType,
        title: titleByStatus[currentStatus],
        message: messageByStatus[currentStatus],
        entityType: NotificationEntityTypes.INVENTORY,
        entityId: result.inventoryId || result._id,
        route: "/dashboard/inventory",
        payload: {
            inventoryReservationId: result._id,
            inventoryId: result.inventoryId,
            orderId: result.orderId || null,
            enquiryId: result.enquiryId || null,
            status: currentStatus,
        },
        priority: currentStatus === "CONSUMED" ? "high" : "medium",
        moduleLabel: "Inventory",
        reference: String(result?._id || ""),
    });
};
