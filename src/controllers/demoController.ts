import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { ProductVariantModel } from "../database/models/productVariant";
import { VariantRateModel } from "../database/models/variantRate";
import { InventoryModel } from "../database/models/inventory";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { InventoryReservationModel } from "../database/models/inventoryReservation";
import { OrderRuleModel } from "../database/models/orderRule";

const DEMO_TAG = "admin-preview";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const canUseDemo = (role: string) => role === "admin" || role === "operator" || role === "team";

const ensureObjectId = (id?: string | Types.ObjectId | null) =>
  id ? new Types.ObjectId(String(id)) : null;

export class DemoController {
  async createOrderDemo(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!canUseDemo(role)) {
        return res.status(403).json({ success: false, message: "Admin only." });
      }

      const demoCreatedBy = ensureObjectId(req.user?.id);
      const existingOrders = await OrderModel.find({
        isDemo: true,
        demoTag: DEMO_TAG,
        demoCreatedBy,
        isDeleted: { $ne: true },
      }).lean();
      if (existingOrders.length > 0) {
        return res.json({ success: true, data: existingOrders });
      }

      const seller = await AssociateModel.findOne({
        associateCompany: { $ne: null },
        isDeleted: { $ne: true },
      }).lean();
      if (!seller?.associateCompany) {
        return res.status(400).json({ success: false, message: "No supplier associate with a company found." });
      }
      const buyer = await AssociateModel.findOne({
        _id: { $ne: seller._id },
        associateCompany: { $ne: null },
        isDeleted: { $ne: true },
      }).lean();
      if (!buyer) {
        return res.status(400).json({ success: false, message: "No buyer associate found for demo." });
      }

      const productVariant = await ProductVariantModel.findOne({ isDeleted: { $ne: true } }).lean();
      if (!productVariant) {
        return res.status(400).json({ success: false, message: "No product variants available for demo." });
      }

      const productId = productVariant.product;
      const sellerCompanyId = seller.associateCompany;

      let demoRate = await VariantRateModel.findOne({
        productVariant: productVariant._id,
        associateCompany: sellerCompanyId,
        isDeleted: { $ne: true },
      }).lean();

      if (!demoRate) {
        const createdRate = await VariantRateModel.create({
          rate: 120,
          productVariant: productVariant._id,
          associate: seller._id,
          associateCompany: sellerCompanyId,
          isLive: false,
          unit: "KG",
          isDemo: true,
          demoTag: DEMO_TAG,
          demoCreatedBy,
        });
        demoRate = await VariantRateModel.findById(createdRate._id).lean();
      }

      const inventoryRows = await InventoryModel.create([
        {
          product: productId,
          productVariant: productVariant._id,
          associate: seller._id,
          associateCompany: sellerCompanyId,
          quantity: 40,
          unit: "MT",
          warehouseName: "Demo Warehouse A",
          linkedVariantRate: demoRate?._id || null,
          isDemo: true,
          demoTag: DEMO_TAG,
          demoCreatedBy,
        },
        {
          product: productId,
          productVariant: productVariant._id,
          associate: seller._id,
          associateCompany: sellerCompanyId,
          quantity: 25,
          unit: "MT",
          warehouseName: "Demo Warehouse B",
          linkedVariantRate: demoRate?._id || null,
          isDemo: true,
          demoTag: DEMO_TAG,
          demoCreatedBy,
        },
      ]);

      const responsibilityPlan = {
        procurementBy: "obaol",
        certificateBy: "obaol",
        transportBy: "obaol",
        shippingBy: "obaol",
        packagingBy: "obaol",
        qualityTestingBy: "obaol",
        cargoInsuranceBy: "obaol",
        exportCustomsBy: "obaol",
        importCustomsBy: "buyer",
        dutiesTaxesBy: "buyer",
        portHandlingBy: "buyer",
        destinationInlandTransportBy: "buyer",
        destinationInspectionBy: "buyer",
        finalDeliveryConfirmationBy: "obaol",
      };

      const enquiry = await InquiryModel.create({
        productId,
        quantity: 10,
        specifications: "Demo enquiry for order preview.",
        packagingSpecifications: "Demo packaging requirements.",
        variantRateId: demoRate?._id || null,
        buyerAssociateId: buyer._id,
        sellerAssociateId: seller._id,
        createdBy: demoCreatedBy,
        sellerAcceptedAt: new Date(),
        buyerConfirmedAt: new Date(),
        responsibilitiesFinalizedAt: new Date(),
        responsibilityPlan,
        executionContext: {
          tradeType: "DOMESTIC",
          originState: "Demo Origin",
          originDistrict: "Demo District",
          destinationState: "Demo Destination",
          destinationDistrict: "Demo District",
        },
        workflowStage: "ORDER_CONFIRMED",
        isDemo: true,
        demoTag: DEMO_TAG,
        demoCreatedBy,
      });

      const firstStage = await OrderRuleModel.findOne({
        isDeleted: { $ne: true },
        isActive: true,
        tradeType: { $in: ["DOMESTIC", "BOTH"] },
      }).sort({ sortOrder: 1 }).lean();

      const order = await OrderModel.create({
        enquiry: enquiry._id,
        responsibilities: responsibilityPlan,
        associateCompanyId: sellerCompanyId,
        workflowStage: String(firstStage?.stageKey || "ORDER_CREATED"),
        isDemo: true,
        demoTag: DEMO_TAG,
        demoCreatedBy,
      });

      await InquiryModel.findByIdAndUpdate(enquiry._id, {
        order: order._id,
        status: enquiry.status,
      });

      return res.json({
        success: true,
        data: {
          order,
          enquiry,
          inventory: inventoryRows,
          rate: demoRate,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async clearOrderDemo(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!canUseDemo(role)) {
        return res.status(403).json({ success: false, message: "Admin only." });
      }
      const demoCreatedBy = ensureObjectId(req.user?.id);

      const orders = await OrderModel.find({ isDemo: true, demoTag: DEMO_TAG, demoCreatedBy }).lean();
      const orderIds = orders.map((o: any) => o._id);

      await TradeDocumentModel.updateMany(
        { isDemo: true, demoTag: DEMO_TAG, demoCreatedBy },
        { $set: { isDeleted: true } }
      );
      await InventoryReservationModel.updateMany(
        { isDemo: true, demoTag: DEMO_TAG, demoCreatedBy },
        { $set: { isDeleted: true } }
      );
      await OrderModel.updateMany(
        { isDemo: true, demoTag: DEMO_TAG, demoCreatedBy },
        { $set: { isDeleted: true } }
      );
      await InquiryModel.updateMany(
        { isDemo: true, demoTag: DEMO_TAG, demoCreatedBy },
        { $set: { isDeleted: true } }
      );
      await InventoryModel.updateMany(
        { isDemo: true, demoTag: DEMO_TAG, demoCreatedBy },
        { $set: { isDeleted: true } }
      );
      await VariantRateModel.updateMany(
        { isDemo: true, demoTag: DEMO_TAG, demoCreatedBy },
        { $set: { isDeleted: true } }
      );

      return res.json({ success: true, data: { clearedOrders: orderIds.length } });
    } catch (error) {
      next(error);
    }
  }

  async createInventoryDemo(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!canUseDemo(role)) {
        return res.status(403).json({ success: false, message: "Admin only." });
      }
      const demoCreatedBy = ensureObjectId(req.user?.id);
      const companyId = ensureObjectId(req.body?.associateCompanyId);
      const company = companyId
        ? await AssociateCompanyModel.findById(companyId).lean()
        : await AssociateCompanyModel.findOne({ isDeleted: { $ne: true } }).lean();
      if (!company?._id) {
        return res.status(400).json({ success: false, message: "Select a company to create demo inventory." });
      }

      const existing = await InventoryModel.find({
        isDemo: true,
        demoTag: DEMO_TAG,
        demoCreatedBy,
        associateCompany: company._id,
        isDeleted: { $ne: true },
      }).lean();
      if (existing.length > 0) {
        return res.json({ success: true, data: existing });
      }

      const associate = await AssociateModel.findOne({
        associateCompany: company._id,
        isDeleted: { $ne: true },
      }).lean();
      if (!associate?._id) {
        return res.status(400).json({ success: false, message: "No associate found for this company." });
      }

      const productVariant = await ProductVariantModel.findOne({ isDeleted: { $ne: true } }).lean();
      if (!productVariant) {
        return res.status(400).json({ success: false, message: "No product variants available for demo." });
      }
      const productId = productVariant.product;

      let demoRate = await VariantRateModel.findOne({
        productVariant: productVariant._id,
        associateCompany: company._id,
        isDeleted: { $ne: true },
      }).lean();
      if (!demoRate) {
        const createdRate = await VariantRateModel.create({
          rate: 110,
          productVariant: productVariant._id,
          associate: associate._id,
          associateCompany: company._id,
          isLive: false,
          unit: "KG",
          isDemo: true,
          demoTag: DEMO_TAG,
          demoCreatedBy,
        });
        demoRate = await VariantRateModel.findById(createdRate._id).lean();
      }

      const rows = await InventoryModel.create([
        {
          product: productId,
          productVariant: productVariant._id,
          associate: associate._id,
          associateCompany: company._id,
          quantity: 30,
          unit: "MT",
          warehouseName: "Demo Storage 1",
          linkedVariantRate: demoRate?._id || null,
          isDemo: true,
          demoTag: DEMO_TAG,
          demoCreatedBy,
        },
        {
          product: productId,
          productVariant: productVariant._id,
          associate: associate._id,
          associateCompany: company._id,
          quantity: 45,
          unit: "MT",
          warehouseName: "Demo Storage 2",
          linkedVariantRate: demoRate?._id || null,
          isDemo: true,
          demoTag: DEMO_TAG,
          demoCreatedBy,
        },
        {
          product: productId,
          productVariant: productVariant._id,
          associate: associate._id,
          associateCompany: company._id,
          quantity: 20,
          unit: "MT",
          warehouseName: "Demo Storage 3",
          linkedVariantRate: demoRate?._id || null,
          isDemo: true,
          demoTag: DEMO_TAG,
          demoCreatedBy,
        },
      ]);

      return res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  async clearInventoryDemo(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!canUseDemo(role)) {
        return res.status(403).json({ success: false, message: "Admin only." });
      }
      const demoCreatedBy = ensureObjectId(req.user?.id);
      await InventoryModel.updateMany(
        { isDemo: true, demoTag: DEMO_TAG, demoCreatedBy },
        { $set: { isDeleted: true } }
      );
      await VariantRateModel.updateMany(
        { isDemo: true, demoTag: DEMO_TAG, demoCreatedBy },
        { $set: { isDeleted: true } }
      );
      return res.json({ success: true, data: { cleared: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const demoController = new DemoController();
