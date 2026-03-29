import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { SampleRequestModel } from "../database/models/sampleRequest";
import { VariantRateModel } from "../database/models/variantRate";
import { AssociateModel } from "../database/models/associate";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isOperatorRole = (role: string) => role === "operator" || role === "team";
const isAssociateRole = (role: string) => role === "associate";
const isAdminLikeRole = (role: string) => isAdminRole(role) || isOperatorRole(role);
const SAMPLE_REQUEST_COOLDOWN_DAYS = Math.max(Number(process.env.SAMPLE_REQUEST_COOLDOWN_DAYS || 7), 0);

const toObjectId = (value: any) => {
  if (!Types.ObjectId.isValid(String(value || ""))) return null;
  return new Types.ObjectId(String(value));
};

const computeBuyerPrice = (supplierPrice: number, markupPercent: number) =>
  Number(supplierPrice) * (1 + Number(markupPercent || 0) / 100);

export class SampleRequestController {
  private async resolveAssociateCompany(userId: string): Promise<string | null> {
    const associate = await AssociateModel.findById(userId)
      .select("_id associateCompany")
      .lean();
    return associate?.associateCompany ? String(associate.associateCompany) : null;
  }

  private getPopulateQuery() {
    return {
      path: "variantRateId",
      select: "rate productVariant associateCompany",
      populate: { path: "productVariant", select: "name product", populate: { path: "product", select: "name" } },
    };
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });

      const buyerAssociateId = (isAdminLikeRole(role) && req.body?.buyerAssociateId)
        ? toObjectId(req.body.buyerAssociateId)
        : toObjectId(userId);

      if (!isAdminLikeRole(role) && !isAssociateRole(role)) {
        return res.status(403).json({ success: false, message: "Only buyers or authorized officers can request samples." });
      }
      if (isAdminLikeRole(role) && !buyerAssociateId) {
        return res.status(400).json({ success: false, message: "buyerAssociateId is required for administrative requests." });
      }
      const variantRateId = toObjectId(req.body?.variantRateId);
      if (!variantRateId) return res.status(400).json({ success: false, message: "variantRateId is required." });

      const requestState = toObjectId(req.body?.requestState);
      const requestDistrict = toObjectId(req.body?.requestDistrict);
      const requestDivision = toObjectId(req.body?.requestDivision);
      const requestCity = toObjectId(req.body?.requestCity);
      const requestAddress = String(req.body?.requestAddress || "").trim();
      const requestPincode = String(req.body?.requestPincode || "").trim();
      const requestedSampleQtyKg = Number(req.body?.requestedSampleQtyKg);

      if (!requestState || !requestDistrict || !requestDivision) {
        return res.status(400).json({ success: false, message: "state, district, and division are required." });
      }

      const variantRate = await VariantRateModel.findById(variantRateId)
        .select("_id productVariant associateCompany")
        .lean();
      if (!variantRate) {
        return res.status(404).json({ success: false, message: "Variant rate not found." });
      }

      if (SAMPLE_REQUEST_COOLDOWN_DAYS > 0) {
        const cutoff = new Date(Date.now() - SAMPLE_REQUEST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        const existing = await SampleRequestModel.findOne({
          variantRateId,
          buyerAssociateId,
          requestedAt: { $gte: cutoff },
          status: { $nin: ["REJECTED", "CANCELLED"] },
          isDeleted: { $ne: true },
        })
          .sort({ requestedAt: -1 })
          .select("requestedAt status")
          .lean();
        if (existing?.requestedAt) {
          const nextAllowedAt = new Date(existing.requestedAt.getTime() + SAMPLE_REQUEST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
          return res.status(409).json({
            success: false,
            message: "Sample already requested. Please try again after the cooling period.",
            nextAllowedAt,
          });
        }
      }

      const created = await SampleRequestModel.create({
        variantRateId,
        productVariant: variantRate.productVariant,
        supplierCompanyId: variantRate.associateCompany,
        buyerAssociateId: buyerAssociateId,
        requestState,
        requestDistrict,
        requestDivision,
        requestCity,
        requestAddress,
        requestPincode,
        requestedSampleQtyKg,
        status: "REQUESTED",
        requestedAt: new Date(),
        markupPercent: 20,
        buyerPrice: null,
      });

      const populated = await SampleRequestModel.findById(created._id)
        .populate({
          path: "variantRateId",
          select: "rate productVariant associateCompany",
          populate: { path: "productVariant", select: "name product", populate: { path: "product", select: "name" } },
        })
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name")
        .lean();

      return res.status(201).json({ success: true, data: populated });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const page = Math.max(parseInt(String(req.query?.page || "1"), 10), 1);
      const limit = Math.min(Math.max(parseInt(String(req.query?.limit || "20"), 10), 1), 200);
      const status = String(req.query?.status || "").toUpperCase();
      const variantRateId = toObjectId(req.query?.variantRateId);
      const requestedBuyerId = toObjectId(req.query?.buyerAssociateId);

      const query: any = { isDeleted: { $ne: true } };
      if (status) query.status = status;
      if (variantRateId) query.variantRateId = variantRateId;

      if (isAdminRole(role) || isOperatorRole(role)) {
        if (requestedBuyerId) query.buyerAssociateId = requestedBuyerId;
      } else if (isAssociateRole(role)) {
        const companyId = await this.resolveAssociateCompany(userId);
        query.$or = [{ buyerAssociateId: userId }];
        if (companyId) {
          query.$or.push({ supplierCompanyId: companyId });
        }
      } else {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const [rows, total] = await Promise.all([
        SampleRequestModel.find(query)
          .sort({ requestedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate(this.getPopulateQuery())
          .populate("supplierCompanyId", "name email phone")
          .populate("buyerAssociateId", "name email phone")
          .populate("requestState", "name")
          .populate("requestDistrict", "name")
          .populate("requestDivision", "name")
          .populate("requestCity", "name")
          .lean(),
        SampleRequestModel.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          data: rows,
          total,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const request = await SampleRequestModel.findById(id)
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name")
        .populate("receiptFileId", "fileURL fileId originalName")
        .lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });

      if (isAdminLikeRole(role)) {
        return res.status(200).json({ success: true, data: request });
      }

      if (isAssociateRole(role)) {
        const companyId = await this.resolveAssociateCompany(userId);
        const canAccess =
          String(request.buyerAssociateId) === String(userId) ||
          (companyId && String(request.supplierCompanyId) === String(companyId));
        if (!canAccess) {
          return res.status(403).json({ success: false, message: "Access denied." });
        }
        return res.status(200).json({ success: true, data: request });
      }

      return res.status(403).json({ success: false, message: "Access denied." });
    } catch (error) {
      next(error);
    }
  }

  async quote(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminLike = isAdminLikeRole(role);
      if (!isAssociateRole(role) && !isAdminLike) {
        return res.status(403).json({ success: false, message: "Only suppliers can quote samples." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const supplierMinQty = Number(req.body?.supplierMinQty);
      const supplierPrice = Number(req.body?.supplierPrice);
      if (!supplierMinQty || Number.isNaN(supplierMinQty) || supplierMinQty <= 0) {
        return res.status(400).json({ success: false, message: "supplierMinQty is required." });
      }
      if (!supplierPrice || Number.isNaN(supplierPrice) || supplierPrice <= 0) {
        return res.status(400).json({ success: false, message: "supplierPrice is required." });
      }

      const companyId = isAdminLike ? null : await this.resolveAssociateCompany(userId);
      if (!isAdminLike && !companyId) {
        return res.status(403).json({ success: false, message: "Supplier company not found." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (!isAdminLike && String(request.supplierCompanyId) !== String(companyId)) {
        return res.status(403).json({ success: false, message: "Not allowed to quote this request." });
      }
      if (request.status !== "REQUESTED") {
        return res.status(400).json({ success: false, message: "Sample request is not in REQUESTED status." });
      }

      const markupPercent = Number(request.markupPercent || 20);
      const buyerPrice = computeBuyerPrice(supplierPrice, markupPercent);

      const updated = await SampleRequestModel.findByIdAndUpdate(
        id,
        {
          supplierMinQty,
          supplierPrice,
          buyerPrice,
          status: "QUOTED",
          quotedAt: new Date(),
        },
        { new: true }
      )
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async decision(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminLike = isAdminLikeRole(role);
      if (!isAssociateRole(role) && !isAdminLike) {
        return res.status(403).json({ success: false, message: "Only buyers can accept or reject samples." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const decision = String(req.body?.decision || "").toUpperCase();
      if (!["ACCEPT", "REJECT"].includes(decision)) {
        return res.status(400).json({ success: false, message: "Decision must be ACCEPT or REJECT." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (!isAdminLike && String(request.buyerAssociateId) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Not allowed to modify this request." });
      }
      if (request.status !== "QUOTED") {
        return res.status(400).json({ success: false, message: "Sample request must be QUOTED before decision." });
      }

      const nextStatus = decision === "ACCEPT" ? "ACCEPTED" : "REJECTED";
      const updatePayload: any = {
        status: nextStatus,
      };
      if (nextStatus === "ACCEPTED") updatePayload.acceptedAt = new Date();
      if (nextStatus === "REJECTED") updatePayload.rejectedAt = new Date();

      const updated = await SampleRequestModel.findByIdAndUpdate(id, updatePayload, { new: true })
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async markup(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdminRole(role)) {
        return res.status(403).json({ success: false, message: "Only admin can update markup." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const markupPercent = Number(req.body?.markupPercent);
      if (Number.isNaN(markupPercent) || markupPercent < 0) {
        return res.status(400).json({ success: false, message: "markupPercent must be a valid number." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });

      const supplierPrice = Number(request.supplierPrice || 0);
      const buyerPrice = supplierPrice ? computeBuyerPrice(supplierPrice, markupPercent) : null;

      const updated = await SampleRequestModel.findByIdAndUpdate(
        id,
        { markupPercent, buyerPrice },
        { new: true }
      )
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async paymentReceived(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminLike = isAdminLikeRole(role);
      if (!isAssociateRole(role) && !isAdminLike) {
        return res.status(403).json({ success: false, message: "Only buyers can confirm payment." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (!isAdminLike && String(request.buyerAssociateId) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Not allowed to update this request." });
      }
      if (request.status !== "ACCEPTED") {
        return res.status(400).json({ success: false, message: "Payment can be confirmed only after acceptance." });
      }

      const updated = await SampleRequestModel.findByIdAndUpdate(
        id,
        { status: "PAYMENT_RECEIVED", paymentReceivedAt: new Date() },
        { new: true }
      )
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async packagingStart(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminLike = isAdminLikeRole(role);
      if (!isAssociateRole(role) && !isAdminLike) {
        return res.status(403).json({ success: false, message: "Only suppliers can start packaging." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (!isAdminLike) {
        const companyId = await this.resolveAssociateCompany(userId);
        if (!companyId || String(request.supplierCompanyId) !== String(companyId)) {
          return res.status(403).json({ success: false, message: "Not allowed to update this request." });
        }
      }
      if (request.status !== "PAYMENT_RECEIVED") {
        return res.status(400).json({ success: false, message: "Packaging can start only after payment is received." });
      }

      const updated = await SampleRequestModel.findByIdAndUpdate(
        id,
        { status: "PREPARING_PACKAGING", packagingStartedAt: new Date() },
        { new: true }
      )
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async packaged(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminLike = isAdminLikeRole(role);
      if (!isAssociateRole(role) && !isAdminLike) {
        return res.status(403).json({ success: false, message: "Only suppliers can mark packaged." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (!isAdminLike) {
        const companyId = await this.resolveAssociateCompany(userId);
        if (!companyId || String(request.supplierCompanyId) !== String(companyId)) {
          return res.status(403).json({ success: false, message: "Not allowed to update this request." });
        }
      }
      if (request.status !== "PREPARING_PACKAGING") {
        return res.status(400).json({ success: false, message: "Packaging can be completed only after it starts." });
      }

      const updated = await SampleRequestModel.findByIdAndUpdate(
        id,
        { status: "PACKAGED", packagedAt: new Date() },
        { new: true }
      )
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async courierSubmit(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminLike = isAdminLikeRole(role);
      if (!isAssociateRole(role) && !isAdminLike) {
        return res.status(403).json({ success: false, message: "Only suppliers can submit to courier." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const trackingNumber = String(req.body?.courierTrackingNumber || "").trim();
      const courierAgencyName = String(req.body?.courierAgencyName || "").trim();
      if (!trackingNumber) {
        return res.status(400).json({ success: false, message: "courierTrackingNumber is required." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (!isAdminLike) {
        const companyId = await this.resolveAssociateCompany(userId);
        if (!companyId || String(request.supplierCompanyId) !== String(companyId)) {
          return res.status(403).json({ success: false, message: "Not allowed to update this request." });
        }
      }
      if (request.status !== "PACKAGED") {
        return res.status(400).json({ success: false, message: "Courier submission is allowed only after packaging." });
      }

      const updated = await SampleRequestModel.findByIdAndUpdate(
        id,
        {
          status: "COURIER_SUBMITTED",
          courierSubmittedAt: new Date(),
          courierTrackingNumber: trackingNumber,
          courierAgencyName: courierAgencyName || null,
        },
        { new: true }
      )
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async inTransit(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminLike = isAdminLikeRole(role);
      if (!isAssociateRole(role) && !isAdminLike) {
        return res.status(403).json({ success: false, message: "Only suppliers can mark in-transit." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (!isAdminLike) {
        const companyId = await this.resolveAssociateCompany(userId);
        if (!companyId || String(request.supplierCompanyId) !== String(companyId)) {
          return res.status(403).json({ success: false, message: "Not allowed to update this request." });
        }
      }
      if (request.status !== "COURIER_SUBMITTED") {
        return res.status(400).json({ success: false, message: "In-transit is allowed only after courier submission." });
      }

      const updated = await SampleRequestModel.findByIdAndUpdate(
        id,
        { status: "IN_TRANSIT", inTransitAt: new Date() },
        { new: true }
      )
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async receiptConfirm(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const isAdminLike = isAdminLikeRole(role);
      if (!isAssociateRole(role) && !isAdminLike) {
        return res.status(403).json({ success: false, message: "Only buyers can confirm receipt." });
      }

      const id = req.params.id;
      if (!Types.ObjectId.isValid(String(id))) {
        return res.status(400).json({ success: false, message: "Invalid sample request id." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (!isAdminLike && String(request.buyerAssociateId) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Not allowed to update this request." });
      }
      if (request.status !== "IN_TRANSIT") {
        return res.status(400).json({ success: false, message: "Receipt can be confirmed only after transit." });
      }

      const receiptFileId = toObjectId(req.body?.receiptFileId);

      const updated = await SampleRequestModel.findByIdAndUpdate(
        id,
        {
          status: "RECEIPT_CONFIRMED",
          receiptConfirmedAt: new Date(),
          receiptFileId: receiptFileId || null,
        },
        { new: true }
      )
        .populate(this.getPopulateQuery())
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestDivision", "name")
        .populate("requestCity", "name")
        .populate("receiptFileId", "fileURL fileId originalName");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
