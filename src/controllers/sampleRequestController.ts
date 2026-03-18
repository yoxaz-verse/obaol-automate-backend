import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { SampleRequestModel } from "../database/models/sampleRequest";
import { VariantRateModel } from "../database/models/variantRate";
import { AssociateModel } from "../database/models/associate";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isOperatorRole = (role: string) => role === "operator" || role === "team";
const isAssociateRole = (role: string) => role === "associate";

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

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
      if (!isAssociateRole(role)) {
        return res.status(403).json({ success: false, message: "Only buyers can request samples." });
      }

      const variantRateId = toObjectId(req.body?.variantRateId);
      const requestState = toObjectId(req.body?.requestState);
      const requestDistrict = toObjectId(req.body?.requestDistrict);
      const requestCity = toObjectId(req.body?.requestCity);
      const requestAddress = String(req.body?.requestAddress || "").trim();
      const requestPincode = String(req.body?.requestPincode || "").trim();

      if (!variantRateId) return res.status(400).json({ success: false, message: "variantRateId is required." });
      if (!requestState || !requestDistrict || !requestCity) {
        return res.status(400).json({ success: false, message: "state, district, and city are required." });
      }
      if (!requestAddress) {
        return res.status(400).json({ success: false, message: "Full address is required." });
      }
      if (!requestPincode) {
        return res.status(400).json({ success: false, message: "Pincode is required." });
      }

      const variantRate = await VariantRateModel.findById(variantRateId)
        .select("_id productVariant associateCompany")
        .lean();
      if (!variantRate) {
        return res.status(404).json({ success: false, message: "Variant rate not found." });
      }
      if (!variantRate.productVariant || !variantRate.associateCompany) {
        return res.status(400).json({ success: false, message: "Variant rate is missing required supplier details." });
      }

      const created = await SampleRequestModel.create({
        variantRateId,
        productVariant: variantRate.productVariant,
        supplierCompanyId: variantRate.associateCompany,
        buyerAssociateId: userId,
        requestState,
        requestDistrict,
        requestCity,
        requestAddress,
        requestPincode,
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

      const query: any = { isDeleted: { $ne: true } };
      if (status) query.status = status;

      if (isAdminRole(role) || isOperatorRole(role)) {
        // full access
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
          .populate({
            path: "variantRateId",
            select: "rate productVariant associateCompany",
            populate: { path: "productVariant", select: "name product", populate: { path: "product", select: "name" } },
          })
          .populate("supplierCompanyId", "name email phone")
          .populate("buyerAssociateId", "name email phone")
          .populate("requestState", "name")
          .populate("requestDistrict", "name")
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

  async quote(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!isAssociateRole(role)) {
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

      const companyId = await this.resolveAssociateCompany(userId);
      if (!companyId) {
        return res.status(403).json({ success: false, message: "Supplier company not found." });
      }

      const request = await SampleRequestModel.findById(id).lean();
      if (!request) return res.status(404).json({ success: false, message: "Sample request not found." });
      if (String(request.supplierCompanyId) !== String(companyId)) {
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
        .populate({
          path: "variantRateId",
          select: "rate productVariant associateCompany",
          populate: { path: "productVariant", select: "name product", populate: { path: "product", select: "name" } },
        })
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
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
      if (!isAssociateRole(role)) {
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
      if (String(request.buyerAssociateId) !== String(userId)) {
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
        .populate({
          path: "variantRateId",
          select: "rate productVariant associateCompany",
          populate: { path: "productVariant", select: "name product", populate: { path: "product", select: "name" } },
        })
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
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
        .populate({
          path: "variantRateId",
          select: "rate productVariant associateCompany",
          populate: { path: "productVariant", select: "name product", populate: { path: "product", select: "name" } },
        })
        .populate("supplierCompanyId", "name email phone")
        .populate("buyerAssociateId", "name email phone")
        .populate("requestState", "name")
        .populate("requestDistrict", "name")
        .populate("requestCity", "name");

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
