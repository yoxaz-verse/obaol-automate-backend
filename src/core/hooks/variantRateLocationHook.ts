import { Types } from "mongoose";
import { AssociateModel } from "../../database/models/associate";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { WarehouseModel } from "../../database/models/warehouse";
import { ExecutionMode, HookFunction, ReadResolver } from "../types";

const badRequest = (message: string) => {
  const err: any = new Error(message);
  err.status = 400;
  err.statusCode = 400;
  return err;
};

const normalizeSource = (value: any) => String(value || "").trim().toUpperCase();

const resolveAssociateCompanyId = async (payload: any): Promise<string | null> => {
  const direct = String(payload?.associateCompany || "").trim();
  if (Types.ObjectId.isValid(direct)) return direct;
  const associateId = String(payload?.associate || "").trim();
  if (!Types.ObjectId.isValid(associateId)) return null;
  const assoc = await AssociateModel.findById(associateId).select("associateCompany").lean();
  const companyId = String((assoc as any)?.associateCompany || "").trim();
  return Types.ObjectId.isValid(companyId) ? companyId : null;
};

export const variantRateLocationPreWriteHook: HookFunction = async (payload, mode) => {
  if (mode !== ExecutionMode.CREATE && mode !== ExecutionMode.UPDATE) return payload;
  if (!payload || typeof payload !== "object") return payload;

  const nextPayload: any = { ...payload };
  const hasWarehouseId = Types.ObjectId.isValid(String(nextPayload.warehouseId || ""));
  const hasOfficeAddress = String(nextPayload.officeAddress || "").trim().length > 0;
  const hasLocationInput = Boolean(nextPayload.locationSource) || hasWarehouseId || hasOfficeAddress;
  if (mode === ExecutionMode.UPDATE && !hasLocationInput) {
    return payload;
  }

  let source = normalizeSource(nextPayload.locationSource);
  if (!source) {
    if (hasWarehouseId) source = "WAREHOUSE";
    if (!source && hasOfficeAddress) source = "OFFICE_ADDRESS";
  }

  if (!source) {
    throw badRequest("Select a location source (Warehouse or Office Address).");
  }

  if (!["WAREHOUSE", "OFFICE_ADDRESS"].includes(source)) {
    throw badRequest("Invalid location source.");
  }

  if (source === "WAREHOUSE") {
    if (!hasWarehouseId) {
      throw badRequest("Warehouse is required for the selected location source.");
    }
    const warehouse = await WarehouseModel.findById(nextPayload.warehouseId).select("_id").lean();
    if (!warehouse) {
      throw badRequest("Selected warehouse was not found.");
    }
    nextPayload.locationSource = "WAREHOUSE";
    nextPayload.officeAddress = "";
  }

  if (source === "OFFICE_ADDRESS") {
    if (!hasOfficeAddress) {
      const companyId = await resolveAssociateCompanyId(nextPayload);
      if (companyId) {
        const company = await AssociateCompanyModel.findById(companyId).select("address").lean();
        const addr = String((company as any)?.address || "").trim();
        if (addr) {
          nextPayload.officeAddress = addr;
        }
      }
    }
    if (!String(nextPayload.officeAddress || "").trim()) {
      throw badRequest("Office address is required for the selected location source.");
    }
    nextPayload.locationSource = "OFFICE_ADDRESS";
    nextPayload.warehouseId = null;
  }

  return nextPayload;
};

export const variantRateLocationPostReadHook: ReadResolver = async (rows: any[]) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const warehouseIds = new Set<string>();
  const companyIds = new Set<string>();
  for (const row of rows) {
    const source = normalizeSource(row?.locationSource);
    if (source === "WAREHOUSE") {
      const wid = row?.warehouseId?._id || row?.warehouseId;
      if (Types.ObjectId.isValid(String(wid))) warehouseIds.add(String(wid));
    }
    if (source === "OFFICE_ADDRESS") {
      if (!String(row?.officeAddress || "").trim()) {
        const cid = row?.associateCompany?._id || row?.associateCompany;
        if (Types.ObjectId.isValid(String(cid))) companyIds.add(String(cid));
      }
    }
  }

  const warehouseMap = new Map<string, any>();
  if (warehouseIds.size > 0) {
    const warehouseRows = await WarehouseModel.find({ _id: { $in: Array.from(warehouseIds) } })
      .select("_id name address")
      .lean();
    warehouseRows.forEach((w: any) => warehouseMap.set(String(w._id), w));
  }

  const companyMap = new Map<string, any>();
  if (companyIds.size > 0) {
    const companyRows = await AssociateCompanyModel.find({ _id: { $in: Array.from(companyIds) } })
      .select("_id address name")
      .lean();
    companyRows.forEach((c: any) => companyMap.set(String(c._id), c));
  }

  return rows.map((row) => {
    const source = normalizeSource(row?.locationSource);
    let locationDisplay = "";

    if (source === "WAREHOUSE") {
      const warehouse = row?.warehouseId?.name ? row.warehouseId : warehouseMap.get(String(row?.warehouseId?._id || row?.warehouseId));
      const name = String(warehouse?.name || "").trim();
      const address = String(warehouse?.address || "").trim();
      locationDisplay = [name, address].filter(Boolean).join(" • ");
    } else if (source === "OFFICE_ADDRESS") {
      const office = String(row?.officeAddress || "").trim();
      if (office) {
        locationDisplay = office;
      } else {
        const company = row?.associateCompany?.address
          ? row.associateCompany
          : companyMap.get(String(row?.associateCompany?._id || row?.associateCompany));
        locationDisplay = String(company?.address || "").trim();
      }
    }

    return {
      ...row,
      locationDisplay: locationDisplay || "--",
    };
  });
};
