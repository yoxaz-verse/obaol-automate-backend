import { Types } from "mongoose";
import { ExecutionMode, HookFunction } from "../types";
import { WarehouseModel } from "../../database/models/warehouse";
import { AssociateModel } from "../../database/models/associate";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();

const resolveAssociateCompany = async (userId: string) => {
  const associate = await AssociateModel.findById(userId)
    .select("_id associateCompany")
    .lean();
  return associate?.associateCompany ? String(associate.associateCompany) : null;
};

export const inventoryWarehouseSelectionHook: HookFunction = async (payload, mode, _id, req) => {
  if (!payload || typeof payload !== "object") return payload;
  if (mode === ExecutionMode.DELETE) return payload;

  const nextPayload: any = { ...(payload || {}) };
  const location = String(nextPayload.storageLocation || "").toUpperCase();
  const warehouseIdRaw = nextPayload.warehouseId;

  if (!location) {
    delete nextPayload.storageLocation;
    return nextPayload;
  }

  if (location === "NONE") {
    nextPayload.custodianType = null;
    nextPayload.warehouseId = null;
    nextPayload.warehouseName = null;
    nextPayload.status = "AVAILABLE";
    nextPayload.storedAt = null;
    delete nextPayload.storageLocation;
    return nextPayload;
  }

  if (location === "PRIVATE") {
    nextPayload.custodianType = null;
    nextPayload.warehouseId = null;
    nextPayload.warehouseName = "Private Location";
    nextPayload.status = "AVAILABLE";
    nextPayload.storedAt = null;
    delete nextPayload.storageLocation;
    return nextPayload;
  }

  if (!warehouseIdRaw || !Types.ObjectId.isValid(String(warehouseIdRaw))) {
    throw new Error("Valid warehouse is required for selected storage location.");
  }

  const warehouse = await WarehouseModel.findById(warehouseIdRaw).lean();
  if (!warehouse || (warehouse as any).isDeleted) {
    throw new Error("Warehouse not found.");
  }

  const role = normalizeRole(req?.user?.role);
  const userId = String(req?.user?.id || "").trim();
  if (role === "associate") {
    const companyId = await resolveAssociateCompany(userId);
    if (!companyId) {
      throw new Error("Associate company not found.");
    }
    if (location === "MY") {
      if (String((warehouse as any).ownerCompanyId || "") !== String(companyId)) {
        throw new Error("You can only select your own warehouses.");
      }
    }
  }

  nextPayload.custodianType = "WAREHOUSE";
  nextPayload.warehouseId = warehouse._id;
  nextPayload.warehouseName = String((warehouse as any).name || "");
  nextPayload.status = "STORED";
  if (!nextPayload.storedAt) {
    nextPayload.storedAt = new Date();
  }

  delete nextPayload.storageLocation;
  return nextPayload;
};
