import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { WarehouseModel } from "../database/models/warehouse";
import { InventoryModel } from "../database/models/inventory";
import { WarehouseMovementLogModel } from "../database/models/warehouseMovementLog";
import { StorageChargeModel } from "../database/models/storageCharge";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { WarehouseAssignmentModel } from "../database/models/warehouseAssignment";
import { getOperatorCompanyScope } from "../core/hooks/operatorScope";
import { getCalculationConfig } from "../utils/calculationConfig";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isAssociateRole = (role: string) => role === "associate";
const isOperatorRole = (role: string) => role === "operator" || role === "team";
const isWarehouseOperatorRole = (role: string) =>
  role === "warehouse_operator" || role === "warehouse-operator" || role === "warehouseoperator";

const toObjectId = (value: any) => {
  if (!Types.ObjectId.isValid(String(value || ""))) return null;
  return new Types.ObjectId(String(value));
};

const toObjectIdArray = (value: any) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toObjectId(item))
    .filter((item): item is Types.ObjectId => Boolean(item));
};

const toNumber = (value: any) => {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num;
};

const toPositiveNumber = (value: any, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
};

const normalizeUnit = (value: any, fallback: "KG" | "MT") => {
  const unit = String(value || fallback).toUpperCase();
  return unit === "KG" ? "KG" : "MT";
};

const toLocation = (value: any) => {
  if (!value || typeof value !== "object") return null;
  const latitude = toNumber(value.latitude);
  const longitude = toNumber(value.longitude);
  if (latitude === null || longitude === null) return null;
  const label = String(value.label || "").trim();
  const district = String(value.district || "").trim();
  const pincode = String(value.pincode || "").trim();
  const city = String(value.city || "").trim();
  const state = String(value.state || "").trim();
  const country = String(value.country || "").trim();
  return {
    latitude,
    longitude,
    ...(label ? { label } : {}),
    ...(district ? { district } : {}),
    ...(pincode ? { pincode } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(country ? { country } : {}),
  };
};

const diffDaysCeil = (fromDate: Date, toDate: Date) => {
  const ms = toDate.getTime() - fromDate.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const computeWarehouseEstimate = (input: {
  requiredMT: number;
  durationMonths: number;
  ratePerUnit: number;
  taxPercent: number;
  handlingPercent: number;
}) => {
  const requiredMT = toPositiveNumber(input.requiredMT, 0);
  const durationMonths = Math.max(1, Math.floor(toPositiveNumber(input.durationMonths, 1)));
  const ratePerUnit = toPositiveNumber(input.ratePerUnit, 0);
  const taxPercent = toPositiveNumber(input.taxPercent, 0);
  const handlingPercent = toPositiveNumber(input.handlingPercent, 0);
  const base = requiredMT * durationMonths * ratePerUnit;
  const tax = (base * taxPercent) / 100;
  const handling = (base * handlingPercent) / 100;
  return {
    base: Number(base.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    handling: Number(handling.toFixed(2)),
    total: Number((base + tax + handling).toFixed(2)),
  };
};

export class WarehouseController {
  private async resolveAssociateCompany(userId: string): Promise<string | null> {
    const associate = await AssociateModel.findById(userId)
      .select("_id associateCompany")
      .lean();
    return associate?.associateCompany ? String(associate.associateCompany) : null;
  }

  private async resolveScopedCompanyId(
    role: string,
    userId: string,
    requestedCompanyIdRaw: any
  ): Promise<{ companyId: string | null; status?: number; message?: string }> {
    if (isAssociateRole(role)) {
      const associateCompanyId = await this.resolveAssociateCompany(userId);
      if (!associateCompanyId) {
        return { companyId: null, status: 400, message: "Associate company not found." };
      }
      return { companyId: associateCompanyId };
    }

    const requestedCompanyId = String(requestedCompanyIdRaw || "").trim();
    if (!Types.ObjectId.isValid(requestedCompanyId)) {
      return { companyId: null, status: 400, message: "Valid companyId is required." };
    }

    if (isOperatorRole(role)) {
      const scope = await getOperatorCompanyScope(userId);
      if (!scope.companyIdSet.has(requestedCompanyId)) {
        return { companyId: null, status: 403, message: "Access denied." };
      }
    }

    const companyExists = await AssociateCompanyModel.exists({ _id: requestedCompanyId });
    if (!companyExists) {
      return { companyId: null, status: 404, message: "Associate company not found." };
    }

    return { companyId: requestedCompanyId };
  }

  async createWarehouse(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
      if (!isAdminRole(role) && !isAssociateRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const name = String(req.body?.name || "").trim();
      const address = String(req.body?.address || "").trim();
      const category = String(req.body?.category || "GENERAL").trim().toUpperCase();
      let storageRatePerUnit = toNumber(req.body?.storageRatePerUnit);
      if (storageRatePerUnit === null) {
        const config = await getCalculationConfig();
        storageRatePerUnit = Number(config.warehouseStorageRateDefault || 0);
      }
      const unit = normalizeUnit(req.body?.unit, "MT");
      const allowedCategoryIds = toObjectIdArray(req.body?.allowedCategoryIds);
      const location = toLocation(req.body?.location);
      const totalCapacity = toNumber(req.body?.totalCapacity);

      if (!name) {
        return res.status(400).json({ success: false, message: "Warehouse name is required." });
      }
      const normalizedStorageRate = storageRatePerUnit === null || storageRatePerUnit < 0 ? 0 : storageRatePerUnit;
      const normalizedCapacity = totalCapacity === null || totalCapacity < 0 ? 0 : totalCapacity;

      const allowedCategories = ["GENERAL", "COLD_STORAGE", "BONDED", "AGRO"];
      let ownerCompanyId: string | null = null;
      let ownerAssociateId: string | null = null;
      if (isAssociateRole(role)) {
        ownerCompanyId = await this.resolveAssociateCompany(userId);
        if (!ownerCompanyId) {
          return res.status(400).json({ success: false, message: "Associate company not found." });
        }
        ownerAssociateId = userId;
      }

      const listingType = String(req.body?.listingType || "PRIVATE").trim().toUpperCase();
      const isRentalActive = Boolean(req.body?.isRentalActive);

      const warehouse = await WarehouseModel.create({
        name,
        address,
        ...(location ? { location } : {}),
        category: allowedCategories.includes(category) ? category : "GENERAL",
        storageRatePerUnit: normalizedStorageRate,
        unit,
        totalCapacity: normalizedCapacity,
        isActive: req.body?.isActive !== undefined ? Boolean(req.body?.isActive) : true,
        ownerCompanyId: ownerCompanyId || req.body?.ownerCompanyId || null,
        ownerAssociateId: ownerAssociateId || req.body?.ownerAssociateId || null,
        listingType: listingType === "RENTAL" ? "RENTAL" : "PRIVATE",
        isRentalActive: listingType === "RENTAL" ? isRentalActive : false,
        allowedCategoryIds,
      });

      return res.status(201).json({ success: true, data: warehouse });
    } catch (error) {
      next(error);
    }
  }

  async listWarehouses(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!isAdminRole(role) && !isWarehouseOperatorRole(role) && !isOperatorRole(role) && !isAssociateRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const query: any = {};
      const scope = String(req.query?.scope || "").toLowerCase();
      if (req.query?.isActive !== undefined) {
        const isActive = String(req.query.isActive) === "true";
        query.isActive = isActive
          ? { $in: [true, "true", 1] }
          : { $in: [false, "false", 0] };
      }

      if (isAssociateRole(role)) {
        const companyId = await this.resolveAssociateCompany(userId);
        if (scope === "my") {
          if (!companyId) {
            return res.status(400).json({ success: false, message: "Associate company not found." });
          }
          query.ownerCompanyId = companyId;
        } else {
          // default to available
          query.isActive = query.isActive ?? { $in: [true, "true", 1] };
          query.$or = [
            { listingType: { $in: ["RENTAL", "rental", "Rental"] }, isRentalActive: { $in: [true, "true", 1] } },
            { listingType: { $in: ["RENTAL", "rental", "Rental"] }, isRentalActive: { $exists: false } },
            { listingType: { $exists: false }, isRentalActive: { $in: [true, "true", 1] } },
          ];
        }
      } else if (scope === "available") {
        query.isActive = query.isActive ?? { $in: [true, "true", 1] };
        query.$or = [
          { listingType: { $in: ["RENTAL", "rental", "Rental"] }, isRentalActive: { $in: [true, "true", 1] } },
          { listingType: { $in: ["RENTAL", "rental", "Rental"] }, isRentalActive: { $exists: false } },
          { listingType: { $exists: false }, isRentalActive: { $in: [true, "true", 1] } },
        ];
      } else if (scope === "my") {
        if (req.query?.ownerCompanyId) {
          query.ownerCompanyId = String(req.query.ownerCompanyId);
        }
      }

      const warehouses = await WarehouseModel.find(query).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: warehouses });
    } catch (error) {
      next(error);
    }
  }

  async updateWarehouse(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!isAdminRole(role) && !isAssociateRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const warehouseId = toObjectId(req.params?.id);
      if (!warehouseId) {
        return res.status(400).json({ success: false, message: "Invalid warehouse id." });
      }

      const payload: any = {};
      if (req.body?.name !== undefined) payload.name = String(req.body?.name || "").trim();
      if (req.body?.address !== undefined) payload.address = String(req.body?.address || "").trim();
      if (req.body?.location !== undefined) {
        if (req.body.location === null) {
          payload.location = null;
        } else {
          const location = toLocation(req.body.location);
          if (location) payload.location = location;
        }
      }
      if (req.body?.category !== undefined) {
        const category = String(req.body?.category || "GENERAL").trim().toUpperCase();
        payload.category = ["GENERAL", "COLD_STORAGE", "BONDED", "AGRO"].includes(category)
          ? category
          : "GENERAL";
      }
      if (req.body?.storageRatePerUnit !== undefined) {
        const rate = toNumber(req.body?.storageRatePerUnit);
        if (rate !== null && rate >= 0) {
          payload.storageRatePerUnit = rate;
        }
      }
      if (req.body?.unit !== undefined) payload.unit = normalizeUnit(req.body?.unit, "MT");
      if (req.body?.allowedCategoryIds !== undefined) {
        payload.allowedCategoryIds = toObjectIdArray(req.body?.allowedCategoryIds);
      }
      if (req.body?.isActive !== undefined) payload.isActive = Boolean(req.body?.isActive);
      if (req.body?.totalCapacity !== undefined) {
        const cap = toNumber(req.body?.totalCapacity);
        if (cap !== null && cap >= 0) {
          payload.totalCapacity = cap;
        }
      }
      if (req.body?.listingType !== undefined) {
        const listingType = String(req.body?.listingType || "PRIVATE").trim().toUpperCase();
        payload.listingType = listingType === "RENTAL" ? "RENTAL" : "PRIVATE";
      }
      if (req.body?.isRentalActive !== undefined) payload.isRentalActive = Boolean(req.body?.isRentalActive);

      if (isAssociateRole(role)) {
        const companyId = await this.resolveAssociateCompany(userId);
        const warehouse = await WarehouseModel.findById(warehouseId).select("ownerCompanyId").lean();
        if (!warehouse) {
          return res.status(404).json({ success: false, message: "Warehouse not found." });
        }
        if (!companyId || String(warehouse.ownerCompanyId || "") !== String(companyId)) {
          return res.status(403).json({ success: false, message: "You can only update your own warehouses." });
        }
      }

      const updated = await WarehouseModel.findByIdAndUpdate(
        warehouseId,
        { $set: payload },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, message: "Warehouse not found." });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async createWarehouseAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
      if (!isAdminRole(role) && !isAssociateRole(role) && !isOperatorRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const warehouseId = toObjectId(req.body?.warehouseId);
      if (!warehouseId) {
        return res.status(400).json({ success: false, message: "Valid warehouseId is required." });
      }

      const warehouse = await WarehouseModel.findById(warehouseId).select("_id isActive storageRatePerUnit").lean();
      if (!warehouse) {
        return res.status(404).json({ success: false, message: "Warehouse not found." });
      }

      const scopedCompany = await this.resolveScopedCompanyId(role, userId, req.body?.companyId);
      if (!scopedCompany.companyId) {
        return res.status(scopedCompany.status || 400).json({
          success: false,
          message: scopedCompany.message || "Company resolution failed.",
        });
      }

      const companyObjectId = new Types.ObjectId(scopedCompany.companyId);
      const requiredMT = toNumber(req.body?.requiredMT);
      if (requiredMT === null || requiredMT <= 0) {
        return res.status(400).json({ success: false, message: "requiredMT must be greater than zero." });
      }

      const durationMonthsRaw = toNumber(req.body?.durationMonths ?? req.body?.months ?? 1);
      const durationMonths = durationMonthsRaw === null ? 1 : Math.floor(durationMonthsRaw);
      if (durationMonths <= 0) {
        return res.status(400).json({ success: false, message: "durationMonths must be greater than zero." });
      }

      const requestTypeRaw = String(req.body?.requestType || "DIRECT_BOOKING").trim().toUpperCase();
      const requestType = requestTypeRaw === "QUOTE_REQUEST" ? "QUOTE_REQUEST" : "DIRECT_BOOKING";
      const bookingStatus = requestType === "QUOTE_REQUEST" ? "PENDING_QUOTE" : "BOOKED";
      const requirementNotes = String(req.body?.requirementNotes || "").trim();
      const expectedStartDateRaw = String(req.body?.expectedStartDate || "").trim();
      const expectedStartDate =
        expectedStartDateRaw && !Number.isNaN(new Date(expectedStartDateRaw).getTime())
          ? new Date(expectedStartDateRaw)
          : null;

      const cfg = await getCalculationConfig();
      const ratePerUnit = toPositiveNumber(req.body?.ratePerUnit ?? warehouse.storageRatePerUnit, 0);
      const taxPercent = toPositiveNumber(req.body?.taxPercent, Number((cfg as any).warehouseTaxPercent ?? cfg.gstPercent ?? 0));
      const handlingPercent = toPositiveNumber(
        req.body?.handlingPercent,
        Number((cfg as any).warehouseHandlingPercent ?? cfg.importAdminCommissionDefault ?? 0)
      );
      const estimate = computeWarehouseEstimate({
        requiredMT,
        durationMonths,
        ratePerUnit,
        taxPercent,
        handlingPercent,
      });
      const estimateCurrency = String(req.body?.estimateCurrency || "INR").trim().toUpperCase() || "INR";

      const assignment = await WarehouseAssignmentModel.findOneAndUpdate(
        { warehouseId, companyId: companyObjectId },
        {
          $set: {
            status: "ACTIVE",
            requiredMT: Number(requiredMT.toFixed(3)),
            durationMonths,
            requirementNotes,
            expectedStartDate,
            estimateBaseAmount: estimate.base,
            estimateTaxAmount: estimate.tax,
            estimateHandlingAmount: estimate.handling,
            estimateTotalAmount: estimate.total,
            estimateCurrency,
            requestType,
            bookingStatus,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
        .populate("warehouseId", "name address category listingType isRentalActive isActive")
        .populate("companyId", "name email assignedOperator")
        .lean();

      return res.status(200).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  async listWarehouseAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
      if (!isAdminRole(role) && !isAssociateRole(role) && !isOperatorRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const query: any = {};
      const warehouseIdRaw = String(req.query?.warehouseId || "").trim();
      const companyIdRaw = String(req.query?.companyId || "").trim();
      const statusRaw = String(req.query?.status || "").trim().toUpperCase();
      const bookingStatusRaw = String(req.query?.bookingStatus || "").trim().toUpperCase();

      if (warehouseIdRaw) {
        if (!Types.ObjectId.isValid(warehouseIdRaw)) {
          return res.status(400).json({ success: false, message: "Invalid warehouseId." });
        }
        query.warehouseId = new Types.ObjectId(warehouseIdRaw);
      }

      if (statusRaw) {
        if (!["ACTIVE", "INACTIVE"].includes(statusRaw)) {
          return res.status(400).json({ success: false, message: "Invalid status filter." });
        }
        query.status = statusRaw;
      }
      if (bookingStatusRaw) {
        if (!["PENDING_QUOTE", "BOOKED", "REJECTED", "CANCELLED"].includes(bookingStatusRaw)) {
          return res.status(400).json({ success: false, message: "Invalid bookingStatus filter." });
        }
        query.bookingStatus = bookingStatusRaw;
      }

      if (isAssociateRole(role)) {
        const associateCompanyId = await this.resolveAssociateCompany(userId);
        if (!associateCompanyId) {
          return res.status(400).json({ success: false, message: "Associate company not found." });
        }
        query.companyId = new Types.ObjectId(associateCompanyId);
      } else if (isOperatorRole(role)) {
        const scope = await getOperatorCompanyScope(userId);
        const scopedCompanyIds = Array.from(scope.companyIdSet);
        if (!scopedCompanyIds.length) {
          return res.status(200).json({ success: true, data: [] });
        }

        if (companyIdRaw) {
          if (!Types.ObjectId.isValid(companyIdRaw)) {
            return res.status(400).json({ success: false, message: "Invalid companyId." });
          }
          if (!scope.companyIdSet.has(companyIdRaw)) {
            return res.status(403).json({ success: false, message: "Access denied." });
          }
          query.companyId = new Types.ObjectId(companyIdRaw);
        } else {
          query.companyId = { $in: scopedCompanyIds.map((id) => new Types.ObjectId(id)) };
        }
      } else if (companyIdRaw) {
        if (!Types.ObjectId.isValid(companyIdRaw)) {
          return res.status(400).json({ success: false, message: "Invalid companyId." });
        }
        query.companyId = new Types.ObjectId(companyIdRaw);
      }

      const assignments = await WarehouseAssignmentModel.find(query)
        .populate("warehouseId", "name address category listingType isRentalActive isActive")
        .populate("companyId", "name email assignedOperator")
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({ success: true, data: assignments });
    } catch (error) {
      next(error);
    }
  }

  async recordInbound(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
      if (!isAdminRole(role) && !isWarehouseOperatorRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const inventoryId = toObjectId(req.body?.inventoryId);
      const warehouseId = toObjectId(req.body?.warehouseId);
      const quantity = toNumber(req.body?.quantity);
      const linkedTradeId = toObjectId(req.body?.linkedTradeId);

      if (!inventoryId || !warehouseId) {
        return res.status(400).json({ success: false, message: "Inventory and warehouse are required." });
      }
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: "Quantity must be greater than zero." });
      }

      const [inventory, warehouse] = await Promise.all([
        InventoryModel.findById(inventoryId),
        WarehouseModel.findById(warehouseId),
      ]);
      if (!inventory) {
        return res.status(404).json({ success: false, message: "Inventory not found." });
      }
      if (!warehouse) {
        return res.status(404).json({ success: false, message: "Warehouse not found." });
      }
      if (!inventory.associateCompany) {
        return res.status(400).json({ success: false, message: "Inventory owner company missing." });
      }
      if (!inventory.associateCompany) {
        return res.status(400).json({ success: false, message: "Inventory owner company missing." });
      }

      inventory.quantity = Number(inventory.quantity || 0) + quantity;
      inventory.custodianType = "WAREHOUSE";
      inventory.warehouseId = warehouseId;
      inventory.status = "STORED";
      if (!inventory.storedAt) {
        inventory.storedAt = new Date();
      }
      await inventory.save();

      const movement = await WarehouseMovementLogModel.create({
        inventoryId,
        warehouseId,
        companyId: inventory.associateCompany,
        type: "INBOUND",
        quantity,
        timestamp: new Date(),
        performedBy: userId,
        linkedTradeId,
        note: String(req.body?.note || "").trim(),
      });

      return res.status(200).json({
        success: true,
        data: { inventory, movement },
      });
    } catch (error) {
      next(error);
    }
  }

  async recordOutbound(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
      if (!isAdminRole(role) && !isWarehouseOperatorRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const inventoryId = toObjectId(req.body?.inventoryId);
      const warehouseId = toObjectId(req.body?.warehouseId);
      const quantity = toNumber(req.body?.quantity);
      const linkedTradeId = toObjectId(req.body?.linkedTradeId);

      if (!inventoryId || !warehouseId) {
        return res.status(400).json({ success: false, message: "Inventory and warehouse are required." });
      }
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: "Quantity must be greater than zero." });
      }

      const [inventory, warehouse] = await Promise.all([
        InventoryModel.findById(inventoryId),
        WarehouseModel.findById(warehouseId),
      ]);
      if (!inventory) {
        return res.status(404).json({ success: false, message: "Inventory not found." });
      }
      if (!warehouse) {
        return res.status(404).json({ success: false, message: "Warehouse not found." });
      }
      if (!inventory.associateCompany) {
        return res.status(400).json({ success: false, message: "Inventory owner company missing." });
      }
      if (String(inventory.warehouseId || "") !== String(warehouseId)) {
        return res.status(400).json({ success: false, message: "Inventory is not stored at this warehouse." });
      }
      if (inventory.quantity < quantity) {
        return res.status(400).json({ success: false, message: "Insufficient inventory quantity." });
      }

      const remaining = Number(inventory.quantity || 0) - quantity;
      inventory.quantity = remaining;
      if (remaining <= 0) {
        inventory.status = "AVAILABLE";
        inventory.custodianType = null;
        inventory.warehouseId = null;
        inventory.storedAt = null;
      } else {
        inventory.status = "STORED";
      }
      await inventory.save();

      const movement = await WarehouseMovementLogModel.create({
        inventoryId,
        warehouseId,
        companyId: inventory.associateCompany,
        type: "OUTBOUND",
        quantity,
        timestamp: new Date(),
        performedBy: userId,
        linkedTradeId,
        note: String(req.body?.note || "").trim(),
      });

      return res.status(200).json({
        success: true,
        data: { inventory, movement },
      });
    } catch (error) {
      next(error);
    }
  }

  async recordAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
      if (!isAdminRole(role) && !isWarehouseOperatorRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const inventoryId = toObjectId(req.body?.inventoryId);
      const warehouseId = toObjectId(req.body?.warehouseId);
      const adjustment = toNumber(req.body?.quantity);
      const linkedTradeId = toObjectId(req.body?.linkedTradeId);

      if (!inventoryId || !warehouseId) {
        return res.status(400).json({ success: false, message: "Inventory and warehouse are required." });
      }
      if (adjustment === null || adjustment === 0) {
        return res.status(400).json({ success: false, message: "Adjustment quantity is required." });
      }

      const [inventory, warehouse] = await Promise.all([
        InventoryModel.findById(inventoryId),
        WarehouseModel.findById(warehouseId),
      ]);
      if (!inventory) {
        return res.status(404).json({ success: false, message: "Inventory not found." });
      }
      if (!warehouse) {
        return res.status(404).json({ success: false, message: "Warehouse not found." });
      }
      if (!inventory.associateCompany) {
        return res.status(400).json({ success: false, message: "Inventory owner company missing." });
      }
      if (String(inventory.warehouseId || "") !== String(warehouseId)) {
        return res.status(400).json({ success: false, message: "Inventory is not stored at this warehouse." });
      }

      const newQty = Number(inventory.quantity || 0) + adjustment;
      if (newQty < 0) {
        return res.status(400).json({ success: false, message: "Adjustment would make quantity negative." });
      }
      inventory.quantity = newQty;
      await inventory.save();

      const movement = await WarehouseMovementLogModel.create({
        inventoryId,
        warehouseId,
        companyId: inventory.associateCompany,
        type: "ADJUSTMENT",
        quantity: Math.abs(adjustment),
        timestamp: new Date(),
        performedBy: userId,
        linkedTradeId,
        note: String(req.body?.note || "").trim(),
      });

      return res.status(200).json({ success: true, data: { inventory, movement } });
    } catch (error) {
      next(error);
    }
  }

  async listMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdminRole(role) && !isWarehouseOperatorRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const query: any = {};
      const warehouseId = toObjectId(req.query?.warehouseId);
      const inventoryId = toObjectId(req.query?.inventoryId);
      const companyId = toObjectId(req.query?.companyId);
      const type = String(req.query?.type || "").toUpperCase();

      if (warehouseId) query.warehouseId = warehouseId;
      if (inventoryId) query.inventoryId = inventoryId;
      if (companyId) query.companyId = companyId;
      if (["INBOUND", "OUTBOUND", "ADJUSTMENT"].includes(type)) query.type = type;

      const movements = await WarehouseMovementLogModel.find(query)
        .sort({ timestamp: -1 })
        .lean();
      return res.status(200).json({ success: true, data: movements });
    } catch (error) {
      next(error);
    }
  }

  async listStorageCharges(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdminRole(role) && !isWarehouseOperatorRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const query: any = {};
      const inventoryId = toObjectId(req.query?.inventoryId);
      const warehouseId = toObjectId(req.query?.warehouseId);
      const companyId = toObjectId(req.query?.companyId);
      const status = String(req.query?.status || "").toUpperCase();

      if (inventoryId) query.inventoryId = inventoryId;
      if (warehouseId) query.warehouseId = warehouseId;
      if (companyId) query.companyId = companyId;
      if (["CALCULATED", "BILLED", "PAID"].includes(status)) query.status = status;

      const charges = await StorageChargeModel.find(query).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: charges });
    } catch (error) {
      next(error);
    }
  }

  async calculateStorageCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdminRole(role) && !isWarehouseOperatorRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const inventoryId = toObjectId(req.body?.inventoryId);
      const warehouseId = toObjectId(req.body?.warehouseId);
      const linkedTradeId = toObjectId(req.body?.linkedTradeId);
      if (!inventoryId || !warehouseId) {
        return res.status(400).json({ success: false, message: "Inventory and warehouse are required." });
      }

      const [inventory, warehouse] = await Promise.all([
        InventoryModel.findById(inventoryId),
        WarehouseModel.findById(warehouseId),
      ]);
      if (!inventory) {
        return res.status(404).json({ success: false, message: "Inventory not found." });
      }
      if (!warehouse) {
        return res.status(404).json({ success: false, message: "Warehouse not found." });
      }

      const fromDateRaw = req.body?.fromDate ? new Date(req.body.fromDate) : (inventory.storedAt || new Date());
      const toDateRaw = req.body?.toDate ? new Date(req.body.toDate) : new Date();
      const durationDays = diffDaysCeil(fromDateRaw, toDateRaw);

      const quantity = Number(req.body?.quantity ?? inventory.quantity ?? 0);
      const ratePerUnit = Number(req.body?.ratePerUnit ?? warehouse.storageRatePerUnit ?? 0);
      const totalCharge = Number((quantity * ratePerUnit * durationDays).toFixed(2));

      const charge = await StorageChargeModel.create({
        inventoryId,
        warehouseId,
        companyId: inventory.associateCompany,
        fromDate: fromDateRaw,
        toDate: toDateRaw,
        durationDays,
        ratePerUnit,
        quantity,
        totalCharge,
        linkedTradeId,
        status: "CALCULATED",
      });

      return res.status(200).json({ success: true, data: charge });
    } catch (error) {
      next(error);
    }
  }
}
