import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { ImportListingModel } from "../database/models/importListing";
import { ImportReservationModel } from "../database/models/importReservation";
import { AssociateModel } from "../database/models/associate";
import { CompanyFunctionMappingModel } from "../database/models/companyFunctionMapping";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { UnLoCodeModel } from "../database/models/unLoCode";
import { ProductVariantModel } from "../database/models/productVariant";
import { InquiryModel } from "../database/models/enquiry";
import { InquiryStatus } from "../core/inquiry/inquiryStateMachine";
import { createInquiryEvent, InquiryEventType } from "../database/models/InquiryEvent";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isOperatorRole = (role: string) => role === "operator" || role === "team";
const isAssociateRole = (role: string) => role === "associate";

const toObjectId = (value: any) => {
  if (!Types.ObjectId.isValid(String(value || ""))) return null;
  return new Types.ObjectId(String(value));
};

const toNumber = (value: any) => {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num;
};

const normalizeUnit = (value: any, fallback: "MT" | "KG") => {
  const unit = String(value || fallback).toUpperCase();
  return unit === "KG" ? "KG" : "MT";
};

const normalizeReservationStatus = (value: any) => {
  const status = String(value || "").toUpperCase();
  if (status === "ACCEPTED") return "APPROVED";
  return status || "PENDING";
};

export class ImportController {
  private async resolveAssociateCompany(userId: string): Promise<string | null> {
    const associate = await AssociateModel.findById(userId)
      .select("_id associateCompany")
      .lean();
    return associate?.associateCompany ? String(associate.associateCompany) : null;
  }

  private async resolveCompanyAssociate(companyId: string): Promise<string | null> {
    const associate = await AssociateModel.findOne({
      associateCompany: companyId,
      isDeleted: { $ne: true },
      isActive: true,
    })
      .select("_id")
      .lean();
    return associate?._id ? String(associate._id) : null;
  }

  private async isImporterCompany(companyId: string | null): Promise<boolean> {
    if (!companyId || !Types.ObjectId.isValid(companyId)) return false;
    const importerFunctions = await CompanyFunctionModel.find({
      slug: { $in: ["importer", "import"] },
      isActive: true,
    })
      .select("_id")
      .lean();
    if (!importerFunctions.length) return false;
    const functionIds = importerFunctions.map((fn) => fn._id);
    const mapping = await CompanyFunctionMappingModel.findOne({
      companyId,
      functionId: { $in: functionIds },
    })
      .select("_id")
      .lean();
    return !!mapping;
  }

  private async recomputeListingState(listingId: Types.ObjectId) {
    const listing = await ImportListingModel.findById(listingId);
    if (!listing) return null;

    const activeStatuses = ["PENDING", "APPROVED", "LOCKED", "ACCEPTED"];
    const reservations = await ImportReservationModel.find({
      listingId,
      isDeleted: { $ne: true },
      status: { $in: activeStatuses },
    }).select("quantityRequested status reservationStatus linkedEnquiryId");

    const reservedQty = reservations.reduce((sum, r: any) => sum + Number(r.quantityRequested || 0), 0);
    listing.availableQuantity = Math.max(0, Number(listing.totalQuantity || 0) - reservedQty);
    listing.status =
      listing.availableQuantity <= 0 ? "FULL" : reservedQty > 0 ? "PARTIAL" : "OPEN";

    const hasLocked = reservations.some(
      (r: any) => normalizeReservationStatus(r.reservationStatus || r.status) === "LOCKED" || r.linkedEnquiryId
    );
    if (hasLocked) {
      listing.importStatus = "ENQUIRY_CREATED";
    } else if (listing.importStatus !== "ENQUIRY_CREATED") {
      const hasApproved = reservations.some(
        (r: any) => normalizeReservationStatus(r.reservationStatus || r.status) === "APPROVED"
      );
      const hasPending = reservations.some(
        (r: any) => normalizeReservationStatus(r.reservationStatus || r.status) === "PENDING"
      );
      if (hasApproved) listing.importStatus = "APPROVED";
      else if (hasPending) listing.importStatus = "RESERVED";
      else listing.importStatus = listing.importStatus === "DRAFT" ? "DRAFT" : "LISTED";
    }

    await listing.save();
    return listing;
  }

  async createListing(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });

      if (!isAdminRole(role) && !isOperatorRole(role) && !isAssociateRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const commodityNameInput = String(req.body?.commodityName || "").trim();
      const totalQuantity = toNumber(req.body?.totalQuantity);
      const price = toNumber(req.body?.price);
      const adminCommissionRaw = toNumber(req.body?.adminCommission);
      const adminCommission = (isAdminRole(role) || isOperatorRole(role)) ? (adminCommissionRaw ?? 0) : 0;
      const quantityUnit = normalizeUnit(req.body?.quantityUnit, "MT");
      const priceUnit = normalizeUnit(req.body?.priceUnit, "KG");

      if (!totalQuantity || totalQuantity <= 0) {
        return res.status(400).json({ success: false, message: "totalQuantity is required." });
      }
      if (!price || price <= 0) {
        return res.status(400).json({ success: false, message: "price is required." });
      }
      if (adminCommission !== null && adminCommission < 0) {
        return res.status(400).json({ success: false, message: "adminCommission cannot be negative." });
      }

      let importerAssociateId = userId;
      let importerCompanyId = req.body?.importerCompanyId ? String(req.body.importerCompanyId) : null;

      if (isAssociateRole(role)) {
        importerCompanyId = await this.resolveAssociateCompany(userId);
      }

      if (!importerCompanyId) {
        return res.status(400).json({ success: false, message: "Importer company is required." });
      }

      const isImporter = await this.isImporterCompany(importerCompanyId);
      if (isAssociateRole(role) && !isImporter) {
        return res.status(403).json({ success: false, message: "Only importer associates can create import listings." });
      }

      const productVariantId = toObjectId(req.body?.productVariant);
      let productId = toObjectId(req.body?.productId);

      if (!productVariantId) {
        return res.status(400).json({ success: false, message: "productVariant is required." });
      }

      const variant = await ProductVariantModel.findById(productVariantId)
        .select("_id product name")
        .populate("product", "name")
        .lean();
      if (!variant) {
        return res.status(400).json({ success: false, message: "Invalid product variant." });
      }
      if (!productId && (variant as any).product) {
        productId = new Types.ObjectId(String((variant as any).product?._id || (variant as any).product));
      }
      if (!productId) {
        return res.status(400).json({ success: false, message: "productId is required." });
      }
      const derivedCommodityName = `${(variant as any)?.product?.name || "Product"} - ${variant.name || "Variant"}`;
      const commodityName = commodityNameInput || derivedCommodityName;

      const expectedArrivalDate = req.body?.expectedArrivalDate ? new Date(req.body.expectedArrivalDate) : null;
      const arrivalWindowDays = toNumber(req.body?.arrivalWindowDays);
      const portId = toObjectId(req.body?.portId);
      let portName = String(req.body?.portName || "").trim() || null;

      if (!portId && !portName) {
        return res.status(400).json({ success: false, message: "Arrival port is required." });
      }
      if (portId) {
        const port = await UnLoCodeModel.findById(portId).select("name loCode").lean();
        if (!port) return res.status(400).json({ success: false, message: "Invalid port." });
        portName = `${port.name} (${port.loCode})`;
      }

      const created = await ImportListingModel.create({
        importerCompanyId,
        importerAssociateId,
        commodityName,
        productId,
        productVariant: productVariantId,
        totalQuantity,
        availableQuantity: totalQuantity,
        quantityUnit,
        price,
        priceUnit,
        adminCommission: adminCommission ?? 0,
        expectedArrivalDate,
        arrivalWindowDays: arrivalWindowDays ?? null,
        portId,
        portName,
        country: "India",
        status: "OPEN",
        importStatus: "LISTED",
      });

      const populated = await ImportListingModel.findById(created._id)
        .populate("importerCompanyId", "name email phone assignedOperator")
        .populate("importerAssociateId", "name email phone")
        .populate({
          path: "productVariant",
          select: "name product",
          populate: { path: "product", select: "name" },
        })
        .populate("portId", "name loCode")
        .lean();

      return res.status(201).json({ success: true, data: populated });
    } catch (error) {
      next(error);
    }
  }

  async listListings(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const page = Math.max(parseInt(String(req.query?.page || "1"), 10), 1);
      const limit = Math.min(Math.max(parseInt(String(req.query?.limit || "20"), 10), 1), 200);
      const status = String(req.query?.status || "").toUpperCase();
      const mine = String(req.query?.mine || "").toLowerCase() === "true";
      const importerCompanyId = String(req.query?.importerCompanyId || "").trim();

      const query: any = { isDeleted: { $ne: true } };
      if (status) {
        const normalized = normalizeReservationStatus(status);
        query.status = { $in: [normalized, status] };
      }

      if (isAdminRole(role) || isOperatorRole(role)) {
        if (importerCompanyId && Types.ObjectId.isValid(importerCompanyId)) {
          query.importerCompanyId = importerCompanyId;
        }
      } else if (isAssociateRole(role)) {
        if (mine) {
          query.importerAssociateId = userId;
        }
      } else {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const [rows, total] = await Promise.all([
        ImportListingModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("importerCompanyId", "name email phone assignedOperator")
          .populate("importerAssociateId", "name email phone")
          .populate({
            path: "productVariant",
            select: "name product",
            populate: { path: "product", select: "name" },
          })
          .populate("portId", "name loCode")
          .lean(),
        ImportListingModel.countDocuments(query),
      ]);

      let viewerCompanyId: string | null = null;
      if (isAssociateRole(role)) {
        viewerCompanyId = await this.resolveAssociateCompany(userId);
      }

      const normalizedRows = rows.map((row: any) => {
        if (!row.importStatus) row.importStatus = "LISTED";
        if (isAdminRole(role)) {
          row.displayPrice = Number(row.price || 0);
          row.canViewCommission = true;
          row.canViewImporter = true;
          return row;
        }

        const importerCompanyId = String(row?.importerCompanyId?._id || row?.importerCompanyId || "");
        const assignedOperatorId = String(row?.importerCompanyId?.assignedOperator || "");
        const isOperatorViewer = isOperatorRole(role) && assignedOperatorId && assignedOperatorId === userId;
        const isImporterViewer = isAssociateRole(role) && viewerCompanyId && importerCompanyId === String(viewerCompanyId);
        const canViewSensitive = isOperatorViewer || isImporterViewer;

        if (!canViewSensitive) {
          row.importerCompanyId = undefined;
        }

        if (canViewSensitive) {
          row.displayPrice = Number(row.price || 0);
          row.canViewCommission = true;
          row.canViewImporter = true;
        } else {
          const finalPrice = Number(row.price || 0) + Number(row.adminCommission || 0);
          row.displayPrice = finalPrice;
          row.price = finalPrice;
          row.adminCommission = undefined;
          row.canViewCommission = false;
          row.canViewImporter = false;
        }

        return row;
      });

      return res.status(200).json({
        success: true,
        data: { data: normalizedRows, total, page, limit },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateListing(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid listing id." });
      }

      const listing = await ImportListingModel.findById(id);
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

      if (!isAdminRole(role) && !isOperatorRole(role)) {
        if (!isAssociateRole(role)) return res.status(403).json({ success: false, message: "Access denied." });
        if (String(listing.importerAssociateId) !== userId) {
          return res.status(403).json({ success: false, message: "Not allowed to edit this listing." });
        }
      }

      const acceptedCount = await ImportReservationModel.countDocuments({
        listingId: listing._id,
        status: { $in: ["APPROVED", "LOCKED", "ACCEPTED"] },
        isDeleted: { $ne: true },
      });
      if (acceptedCount > 0) {
        return res.status(400).json({ success: false, message: "Cannot edit listing after reservations are accepted." });
      }

      const patch: any = {};
      if (req.body?.commodityName !== undefined) {
        patch.commodityName = String(req.body?.commodityName || "").trim();
      }
      if (req.body?.totalQuantity !== undefined) {
        const totalQuantity = toNumber(req.body?.totalQuantity);
        if (!totalQuantity || totalQuantity <= 0) {
          return res.status(400).json({ success: false, message: "totalQuantity must be greater than 0." });
        }
        const reserved = Number(listing.totalQuantity) - Number(listing.availableQuantity);
        if (totalQuantity < reserved) {
          return res.status(400).json({ success: false, message: "totalQuantity cannot be less than already reserved quantity." });
        }
        patch.totalQuantity = totalQuantity;
        patch.availableQuantity = totalQuantity - reserved;
      }
      if (req.body?.price !== undefined) {
        const price = toNumber(req.body?.price);
        if (!price || price <= 0) return res.status(400).json({ success: false, message: "price must be greater than 0." });
        patch.price = price;
      }
      if (req.body?.adminCommission !== undefined && (isAdminRole(role) || isOperatorRole(role))) {
        const adminCommission = toNumber(req.body?.adminCommission);
        if (adminCommission !== null && adminCommission < 0) {
          return res.status(400).json({ success: false, message: "adminCommission cannot be negative." });
        }
        patch.adminCommission = adminCommission ?? 0;
      }
      if (req.body?.quantityUnit !== undefined) {
        patch.quantityUnit = normalizeUnit(req.body?.quantityUnit, listing.quantityUnit as any);
      }
      if (req.body?.priceUnit !== undefined) {
        patch.priceUnit = normalizeUnit(req.body?.priceUnit, listing.priceUnit as any);
      }
      if (req.body?.expectedArrivalDate !== undefined) {
        patch.expectedArrivalDate = req.body?.expectedArrivalDate ? new Date(req.body.expectedArrivalDate) : null;
      }
      if (req.body?.arrivalWindowDays !== undefined) {
        patch.arrivalWindowDays = toNumber(req.body?.arrivalWindowDays);
      }
      if (req.body?.portId !== undefined || req.body?.portName !== undefined) {
        const portId = toObjectId(req.body?.portId);
        let portName = String(req.body?.portName || "").trim() || null;
        if (!portId && !portName) {
          return res.status(400).json({ success: false, message: "Arrival port is required." });
        }
        if (portId) {
          const port = await UnLoCodeModel.findById(portId).select("name loCode").lean();
          if (!port) return res.status(400).json({ success: false, message: "Invalid port." });
          portName = `${port.name} (${port.loCode})`;
        }
        patch.portId = portId;
        patch.portName = portName;
      }

      const updated = await ImportListingModel.findByIdAndUpdate(id, { $set: patch }, { new: true })
        .populate("importerCompanyId", "name email phone assignedOperator")
        .populate("importerAssociateId", "name email phone")
        .populate({
          path: "productVariant",
          select: "name product",
          populate: { path: "product", select: "name" },
        })
        .populate("portId", "name loCode")
        .lean();

      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async closeListing(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid listing id." });

      const listing = await ImportListingModel.findById(id);
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

      if (!isAdminRole(role) && !isOperatorRole(role)) {
        if (!isAssociateRole(role)) return res.status(403).json({ success: false, message: "Access denied." });
        if (String(listing.importerAssociateId) !== userId) {
          return res.status(403).json({ success: false, message: "Not allowed to close this listing." });
        }
      }

      listing.status = "CLOSED";
      await listing.save();
      return res.json({ success: true, data: listing });
    } catch (error) {
      next(error);
    }
  }

  async createReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminUser = isAdminRole(role);
      if (!isAssociateRole(role) && !isAdminUser) {
        return res.status(403).json({ success: false, message: "Only buyers or admins can reserve quantities." });
      }

      const listingId = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(listingId)) {
        return res.status(400).json({ success: false, message: "Invalid listing id." });
      }

      const quantityRequested = toNumber(req.body?.quantityRequested);
      if (!quantityRequested || quantityRequested <= 0) {
        return res.status(400).json({ success: false, message: "quantityRequested is required." });
      }

      const listing = await ImportListingModel.findById(listingId).lean();
      if (!listing || listing.isDeleted) {
        return res.status(404).json({ success: false, message: "Listing not found." });
      }
      if (listing.status === "CLOSED" || listing.status === "FULL" || listing.importStatus === "ENQUIRY_CREATED") {
        return res.status(400).json({ success: false, message: "Listing is closed or fully reserved." });
      }
      const activeStatuses = ["PENDING", "APPROVED", "LOCKED", "ACCEPTED"];
      const existingReserved = await ImportReservationModel.aggregate([
        { $match: { listingId: new Types.ObjectId(listingId), isDeleted: { $ne: true }, status: { $in: activeStatuses } } },
        { $group: { _id: "$listingId", qty: { $sum: "$quantityRequested" } } },
      ]);
      const reservedQty = existingReserved?.[0]?.qty || 0;
      const available = Math.max(0, Number(listing.totalQuantity || 0) - reservedQty);
      if (available < quantityRequested) {
        return res.status(400).json({ success: false, message: "Requested quantity exceeds availability." });
      }

      let companyId: any = null;
      let buyerAssociateId: any = userId;
      if (isAdminUser) {
        const bodyCompanyId = String(req.body?.buyerCompanyId || "").trim();
        if (!bodyCompanyId || !Types.ObjectId.isValid(bodyCompanyId)) {
          return res.status(400).json({ success: false, message: "buyerCompanyId is required for admin reservations." });
        }
        companyId = bodyCompanyId;
        const bodyAssociateId = String(req.body?.buyerAssociateId || "").trim();
        if (bodyAssociateId && Types.ObjectId.isValid(bodyAssociateId)) {
          buyerAssociateId = bodyAssociateId;
        } else {
          const resolvedAssociateId = await this.resolveCompanyAssociate(companyId);
          if (!resolvedAssociateId) {
            return res.status(400).json({ success: false, message: "No buyer associate found for the selected company." });
          }
          buyerAssociateId = resolvedAssociateId;
        }
      } else {
        companyId = await this.resolveAssociateCompany(userId);
        if (!companyId) {
          return res.status(400).json({ success: false, message: "Buyer company not found." });
        }
      }
      if (String(buyerAssociateId) === String(listing.importerAssociateId)) {
        return res.status(400).json({
          success: false,
          message: "Selected buyer maps to the same associate as the importer. Please choose a different buyer.",
        });
      }

      const created = await ImportReservationModel.create({
        listingId,
        buyerAssociateId,
        buyerCompanyId: companyId,
        quantityRequested,
        status: "PENDING",
        reservationStatus: "PENDING",
        requestedAt: new Date(),
      });

      await this.recomputeListingState(new Types.ObjectId(listingId));

      const populated = await ImportReservationModel.findById(created._id)
        .populate({
          path: "listingId",
          populate: [
            { path: "importerCompanyId", select: "name" },
            { path: "portId", select: "name loCode" },
          ],
        })
        .populate("buyerAssociateId", "name email phone")
        .populate("buyerCompanyId", "name")
        .lean();

      return res.status(201).json({ success: true, data: populated });
    } catch (error) {
      next(error);
    }
  }

  async listReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const page = Math.max(parseInt(String(req.query?.page || "1"), 10), 1);
      const limit = Math.min(Math.max(parseInt(String(req.query?.limit || "20"), 10), 1), 200);
      const status = String(req.query?.status || "").toUpperCase();
      const mine = String(req.query?.mine || "").toLowerCase() === "true";
      const listingId = String(req.query?.listingId || "").trim();

      const query: any = { isDeleted: { $ne: true } };
      if (status) query.status = status;
      if (listingId && Types.ObjectId.isValid(listingId)) {
        query.listingId = listingId;
      }

      if (isAdminRole(role) || isOperatorRole(role)) {
        // full access
      } else if (isAssociateRole(role)) {
        if (mine) {
          query.buyerAssociateId = userId;
        } else if (listingId) {
          const listing = await ImportListingModel.findById(listingId).select("importerCompanyId").lean();
          const companyId = await this.resolveAssociateCompany(userId);
          if (!listing || !companyId || String(listing.importerCompanyId) !== String(companyId)) {
            return res.status(403).json({ success: false, message: "Not allowed to view these reservations." });
          }
        } else {
          query.buyerAssociateId = userId;
        }
      } else {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const [rows, total] = await Promise.all([
        ImportReservationModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate({
            path: "listingId",
            populate: [
              { path: "importerCompanyId", select: "name assignedOperator" },
              { path: "portId", select: "name loCode" },
            ],
          })
          .populate("buyerAssociateId", "name email phone")
          .populate("buyerCompanyId", "name")
          .lean(),
        ImportReservationModel.countDocuments(query),
      ]);

      let viewerCompanyId: string | null = null;
      if (isAssociateRole(role)) {
        viewerCompanyId = await this.resolveAssociateCompany(userId);
      }

      const normalizedRows = rows.map((row: any) => {
        if (!row.reservationStatus) row.reservationStatus = normalizeReservationStatus(row.status);
        if (isAdminRole(role)) {
          if (row?.listingId) {
            row.listingId.displayPrice = Number(row.listingId.price || 0);
            row.listingId.canViewCommission = true;
            row.listingId.canViewImporter = true;
          }
          return row;
        }
        const importerCompanyId = String(row?.listingId?.importerCompanyId?._id || "");
        const assignedOperatorId = String(row?.listingId?.importerCompanyId?.assignedOperator || "");
        const isOperatorViewer = isOperatorRole(role) && assignedOperatorId && assignedOperatorId === userId;
        const isImporterViewer = isAssociateRole(role) && viewerCompanyId && importerCompanyId === String(viewerCompanyId);
        const canViewSensitive = isOperatorViewer || isImporterViewer;
        if (row?.listingId) {
          if (!canViewSensitive) {
            const commission = Number(row.listingId.adminCommission || 0);
            const finalPrice = Number(row.listingId.price || 0) + commission;
            row.listingId.displayPrice = finalPrice;
            row.listingId.price = finalPrice;
            row.listingId.importerCompanyId = undefined;
            row.listingId.adminCommission = undefined;
            row.listingId.canViewCommission = false;
            row.listingId.canViewImporter = false;
          } else {
            row.listingId.displayPrice = Number(row.listingId.price || 0);
            row.listingId.canViewCommission = true;
            row.listingId.canViewImporter = true;
          }
        }
        return row;
      });

      return res.status(200).json({
        success: true,
        data: { data: normalizedRows, total, page, limit },
      });
    } catch (error) {
      next(error);
    }
  }

  async acceptReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid reservation id." });

      const reservation = await ImportReservationModel.findById(id);
      if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found." });
      const currentStatus = normalizeReservationStatus(reservation.reservationStatus || reservation.status);
      if (currentStatus !== "PENDING") {
        return res.status(400).json({ success: false, message: "Reservation is not pending." });
      }

      const listing = await ImportListingModel.findById(reservation.listingId);
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

      if (!isAdminRole(role) && !isOperatorRole(role)) {
        if (!isAssociateRole(role)) return res.status(403).json({ success: false, message: "Access denied." });
        if (String(listing.importerAssociateId) !== userId) {
          return res.status(403).json({ success: false, message: "Not allowed to accept this reservation." });
        }
      }

      if (listing.status === "CLOSED" || listing.status === "FULL" || listing.importStatus === "ENQUIRY_CREATED") {
        return res.status(400).json({ success: false, message: "Listing is closed or fully reserved." });
      }
      const approvedReserved = await ImportReservationModel.aggregate([
        {
          $match: {
            listingId: listing._id,
            isDeleted: { $ne: true },
            status: { $in: ["APPROVED", "LOCKED", "ACCEPTED"] },
            _id: { $ne: reservation._id },
          },
        },
        { $group: { _id: "$listingId", qty: { $sum: "$quantityRequested" } } },
      ]);
      const alreadyApprovedQty = approvedReserved?.[0]?.qty || 0;
      const availableAfterApproved = Math.max(0, Number(listing.totalQuantity || 0) - alreadyApprovedQty);
      if (availableAfterApproved < Number(reservation.quantityRequested || 0)) {
        return res.status(400).json({
          success: false,
          message: "Not enough quantity available to approve this reservation.",
        });
      }

      reservation.status = "APPROVED";
      reservation.reservationStatus = "APPROVED";
      reservation.acceptedAt = new Date();
      await reservation.save();

      await this.recomputeListingState(listing._id);

      const populated = await ImportReservationModel.findById(reservation._id)
        .populate({
          path: "listingId",
          populate: [
            { path: "importerCompanyId", select: "name" },
            { path: "portId", select: "name loCode" },
          ],
        })
        .populate("buyerAssociateId", "name email phone")
        .populate("buyerCompanyId", "name")
        .lean();

      return res.json({ success: true, data: populated });
    } catch (error) {
      next(error);
    }
  }

  async rejectReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid reservation id." });

      const reservation = await ImportReservationModel.findById(id);
      if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found." });
      const currentStatus = normalizeReservationStatus(reservation.reservationStatus || reservation.status);
      if (currentStatus !== "PENDING") {
        return res.status(400).json({ success: false, message: "Reservation is not pending." });
      }

      const listing = await ImportListingModel.findById(reservation.listingId).select("importerAssociateId").lean();
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

      if (!isAdminRole(role) && !isOperatorRole(role)) {
        if (!isAssociateRole(role)) return res.status(403).json({ success: false, message: "Access denied." });
        if (String(listing.importerAssociateId) !== userId) {
          return res.status(403).json({ success: false, message: "Not allowed to reject this reservation." });
        }
      }

      reservation.status = "REJECTED";
      reservation.reservationStatus = "REJECTED";
      reservation.rejectedAt = new Date();
      await reservation.save();
      await this.recomputeListingState(reservation.listingId as any);
      return res.json({ success: true, data: reservation });
    } catch (error) {
      next(error);
    }
  }

  async cancelReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid reservation id." });

      const reservation = await ImportReservationModel.findById(id);
      if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found." });
      if (!isAdminRole(role)) {
        if (!isAssociateRole(role)) {
          return res.status(403).json({ success: false, message: "Only buyers or admins can cancel reservations." });
        }
        if (String(reservation.buyerAssociateId) !== userId) {
          return res.status(403).json({ success: false, message: "Not allowed to cancel this reservation." });
        }
      }
      const currentStatus = normalizeReservationStatus(reservation.reservationStatus || reservation.status);
      if (currentStatus !== "PENDING") {
        return res.status(400).json({ success: false, message: "Only pending reservations can be cancelled." });
      }

      reservation.status = "CANCELLED";
      reservation.reservationStatus = "CANCELLED";
      reservation.cancelledAt = new Date();
      await reservation.save();
      await this.recomputeListingState(reservation.listingId as any);
      return res.json({ success: true, data: reservation });
    } catch (error) {
      next(error);
    }
  }

  async editReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const listingId = String(req.params?.id || "");
      const reservationId = String(req.params?.reservationId || "");
      if (!Types.ObjectId.isValid(listingId) || !Types.ObjectId.isValid(reservationId)) {
        return res.status(400).json({ success: false, message: "Invalid reservation id." });
      }

      const reservation = await ImportReservationModel.findById(reservationId);
      if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found." });
      const currentStatus = normalizeReservationStatus(reservation.reservationStatus || reservation.status);
      if (currentStatus !== "PENDING") {
        return res.status(400).json({ success: false, message: "Only pending reservations can be edited." });
      }

      if (!isAdminRole(role)) {
        if (!isAssociateRole(role)) {
          return res.status(403).json({ success: false, message: "Only buyers or admins can edit reservations." });
        }
        if (String(reservation.buyerAssociateId) !== userId) {
          return res.status(403).json({ success: false, message: "Not allowed to edit this reservation." });
        }
      }

      const listing = await ImportListingModel.findById(listingId);
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
      if (String(listing._id) !== String(reservation.listingId)) {
        return res.status(400).json({ success: false, message: "Reservation does not belong to this listing." });
      }

      const quantityRequested = toNumber(req.body?.quantityRequested);
      if (!quantityRequested || quantityRequested <= 0) {
        return res.status(400).json({ success: false, message: "quantityRequested is required." });
      }

      const activeStatuses = ["PENDING", "APPROVED", "LOCKED", "ACCEPTED"];
      const otherReserved = await ImportReservationModel.aggregate([
        {
          $match: {
            listingId: listing._id,
            isDeleted: { $ne: true },
            status: { $in: activeStatuses },
            _id: { $ne: reservation._id },
          },
        },
        { $group: { _id: "$listingId", qty: { $sum: "$quantityRequested" } } },
      ]);
      const reservedQty = otherReserved?.[0]?.qty || 0;
      const available = Math.max(0, Number(listing.totalQuantity || 0) - reservedQty);
      if (available < quantityRequested) {
        return res.status(400).json({ success: false, message: "Requested quantity exceeds availability." });
      }

      reservation.quantityRequested = quantityRequested;
      await reservation.save();
      await this.recomputeListingState(listing._id);

      return res.json({ success: true, data: reservation });
    } catch (error) {
      next(error);
    }
  }

  async lockReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const listingId = String(req.params?.id || "");
      const reservationId = String(req.params?.reservationId || "");
      if (!Types.ObjectId.isValid(listingId) || !Types.ObjectId.isValid(reservationId)) {
        return res.status(400).json({ success: false, message: "Invalid reservation id." });
      }

      const reservation = await ImportReservationModel.findById(reservationId);
      if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found." });
      const currentStatus = normalizeReservationStatus(reservation.reservationStatus || reservation.status);
      if (currentStatus !== "APPROVED") {
        return res.status(400).json({ success: false, message: "Only approved reservations can be locked." });
      }

      const listing = await ImportListingModel.findById(listingId);
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
      if (String(listing._id) !== String(reservation.listingId)) {
        return res.status(400).json({ success: false, message: "Reservation does not belong to this listing." });
      }

      if (!isAdminRole(role) && !isOperatorRole(role)) {
        if (!isAssociateRole(role)) return res.status(403).json({ success: false, message: "Access denied." });
        if (String(listing.importerAssociateId) !== userId) {
          return res.status(403).json({ success: false, message: "Not allowed to lock this reservation." });
        }
      }

      if (reservation.linkedEnquiryId) {
        return res.status(400).json({ success: false, message: "Reservation already locked and linked to enquiry." });
      }

      if (!listing.productId && !listing.productVariant) {
        return res.status(400).json({ success: false, message: "Listing requires a product or variant to create an enquiry." });
      }

      let productId = listing.productId;
      if (!productId && listing.productVariant) {
        const variant = await ProductVariantModel.findById(listing.productVariant).select("product").lean();
        if (variant?.product) productId = variant.product as any;
      }
      if (!productId) {
        return res.status(400).json({ success: false, message: "Unable to resolve product for enquiry." });
      }

      if (!reservation.buyerAssociateId) {
        return res.status(400).json({ success: false, message: "Buyer associate is required to create an enquiry." });
      }
      if (String(reservation.buyerAssociateId) === String(listing.importerAssociateId)) {
        return res.status(400).json({
          success: false,
          message: "Buyer and seller cannot be the same associate.",
          debug: {
            buyerAssociateId: String(reservation.buyerAssociateId),
            sellerAssociateId: String(listing.importerAssociateId),
          },
        });
      }

      const enquiry = await InquiryModel.create({
        productId,
        quantity: reservation.quantityRequested,
        buyerAssociateId: reservation.buyerAssociateId,
        sellerAssociateId: listing.importerAssociateId,
        mediatorAssociateId: null,
        variantRateId: null,
        catalogItemId: null,
        rate: listing.price,
        adminCommission: Number((listing as any).adminCommission || 0),
        mediatorCommission: 0,
        sourceType: "IMPORT",
        importListingId: listing._id,
        importReservationId: reservation._id,
        arrivalPortId: listing.portId || null,
        arrivalPortName: listing.portName || null,
        expectedArrivalDate: listing.expectedArrivalDate || null,
        executionContext: {
          tradeType: "INTERNATIONAL",
          destinationCountry: "India",
          destinationPort: listing.portName || null,
        },
        sellerAcceptedAt: new Date(),
        status: InquiryStatus.NEW,
        workflowStage: "QUOTATION_REVISION",
        createdBy: req.user!.id,
      });

      await createInquiryEvent(
        enquiry._id,
        InquiryEventType.CREATED,
        req.user!.id,
        { metadata: { status: InquiryStatus.NEW } }
      );

      reservation.status = "LOCKED";
      reservation.reservationStatus = "LOCKED";
      reservation.linkedEnquiryId = enquiry._id;
      await reservation.save();

      listing.importStatus = "ENQUIRY_CREATED";
      await listing.save();
      await this.recomputeListingState(listing._id);

      const populated = await ImportReservationModel.findById(reservation._id)
        .populate({
          path: "listingId",
          populate: [
            { path: "importerCompanyId", select: "name" },
            { path: "portId", select: "name loCode" },
          ],
        })
        .populate("buyerAssociateId", "name email phone")
        .populate("buyerCompanyId", "name")
        .populate("linkedEnquiryId", "status workflowStage")
        .lean();

      return res.json({ success: true, data: populated });
    } catch (error) {
      next(error);
    }
  }
}
