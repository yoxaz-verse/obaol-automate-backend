import { Router } from "express";

import authRoute from "./authRoute";
import verifyTokenRoute from "./verifyTokenRoute";
import verificationRoutes from "./verificationRoutes";
import genericCrudRoute from "./genericCrudRoute";

// Initialize the main router
const router = Router();
const version = "v1";
const webRoute = "web";
export const prefix = `/${version}/${webRoute}`;


// --- Specialized Routes (High Priority) ---

// Auth
router.use(`${prefix}/auth`, authRoute);
router.use(`${prefix}/login`, authRoute);
router.use(`${prefix}/verify-token`, verifyTokenRoute);
router.use(`${prefix}/verification`, verificationRoutes);

// Orders
import orderRoutes from "./v1/orderRoutes";
router.use(`${prefix}/orders`, orderRoutes);

// Inquiries (Clean deterministic engine)
import inquiryRoutes from "./v1/inquiryRoutes";
router.use(`${prefix}/inquiries`, inquiryRoutes);

// Standalone service requests
import serviceRequestRoutes from "./v1/serviceRequestRoutes";
router.use(`${prefix}/service-requests`, serviceRequestRoutes);
console.info(`[routes] mounted ${prefix}/service-requests`);

// Sample requests
import sampleRequestRoutes from "./v1/sampleRequestRoutes";
router.use(`${prefix}/sample-requests`, sampleRequestRoutes);
console.info(`[routes] mounted ${prefix}/sample-requests`);

// Imports (incoming loads)
import importRoutes from "./v1/importRoutes";
router.use(`${prefix}/imports`, importRoutes);
console.info(`[routes] mounted ${prefix}/imports`);
import importReservationRoutes from "./v1/importReservationRoutes";
router.use(`${prefix}/import-reservations`, importReservationRoutes);
console.info(`[routes] mounted ${prefix}/import-reservations`);

// Warehouses (operators + storage)
import warehouseRoutes from "./v1/warehouseRoutes";
router.use(`${prefix}`, warehouseRoutes);
console.info(`[routes] mounted ${prefix}/warehouse`);

// Trade documents
import tradeDocumentRoutes from "./v1/tradeDocumentRoutes";
router.use(`${prefix}/trade-documents`, tradeDocumentRoutes);
console.info(`[routes] mounted ${prefix}/trade-documents`);
// Document rules
import documentRuleRoutes from "./v1/documentRuleRoutes";
router.use(`${prefix}/document-rules`, documentRuleRoutes);
console.info(`[routes] mounted ${prefix}/document-rules`);

// Enquiry rules
import enquiryRuleRoutes from "./v1/enquiryRuleRoutes";
import orderRuleRoutes from "./v1/orderRuleRoutes";
import flowRuleRoutes from "./v1/flowRuleRoutes";
router.use(`${prefix}/enquiry-rules`, enquiryRuleRoutes);
console.info(`[routes] mounted ${prefix}/enquiry-rules`);
router.use(`${prefix}/order-rules`, orderRuleRoutes);
console.info(`[routes] mounted ${prefix}/order-rules`);
router.use(`${prefix}/flow-rules`, flowRuleRoutes);
console.info(`[routes] mounted ${prefix}/flow-rules`);

// Analytics
import analyticsRoutes from "./analyticsRoutes";
router.use(`${prefix}/analytics`, analyticsRoutes);

// Company Function System
import companyFunctionRoutes from "./v1/companyFunctionRoutes";
router.use(`${prefix}`, companyFunctionRoutes);

// Approvals (Admin)
import approvalRoutes from "./v1/approvalRoutes";
router.use(`${prefix}/approvals`, approvalRoutes);

// Notifications (Authenticated)
import notificationRoutes from "./v1/notificationRoutes";
router.use(`${prefix}/notifications`, notificationRoutes);

// Presence ping (authenticated)
import presenceRoutes from "./v1/presenceRoutes";
router.use(`${prefix}/presence`, presenceRoutes);

// Associate onboarding (dashboard tutorial)
import associateOnboardingRoutes from "./v1/associateOnboardingRoutes";
router.use(`${prefix}`, associateOnboardingRoutes);

// Organization reports (custom admin actions + generic CRUD via catch-all)
import organizationReportRoutes from "./v1/organizationReportRoutes";
router.use(`${prefix}/organization-reports`, organizationReportRoutes);

// Operator hierarchy + commissions
import operatorHierarchyRoutes from "./v1/operatorHierarchyRoutes";
import commissionRoutes from "./v1/commissionRoutes";
router.use("/commissions", commissionRoutes);
router.use("/operators", operatorHierarchyRoutes);
router.use(`${prefix}/operators`, operatorHierarchyRoutes);
router.use(`${prefix}/commissions`, commissionRoutes);


// Catalog Management (Associate)
import catalogRoutes from "./v1/catalogRoutes";
router.use(`${prefix}/catalog`, catalogRoutes);

// Company Metrics
import { CompanyController } from "../controllers/CompanyController";
router.get(`${prefix}/associate-companies/:id/stats`, CompanyController.getTeamStats);

// Diagnostic Routes (Development)
import diagnosticRoutes from "./diagnosticRoutes";
router.use(`${prefix}/diagnostic`, diagnosticRoutes);

// Public Routes (No Auth)
import { GenericCrudController } from "../controllers/genericCrudController";
import brandRoutes from "./v1/brandRoutes";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";
import { VariantRateModel } from "../database/models/variantRate";
import demoRoutes from "./v1/demoRoutes";
const publicCrud = new GenericCrudController();
router.get(`${prefix}/products`, (req, res, next) => { (req.params as any).entity = "products"; next(); }, publicCrud.handleRequest.bind(publicCrud));
router.get(`${prefix}/products/slug/:slug/summary`, async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase().trim();
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Product slug is required.",
      });
    }

    const product = await ProductModel.findOne({
      slug,
      isDeleted: { $ne: true },
    }).select("_id name slug").lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const variants = await ProductVariantModel.find({
      product: product._id,
      isDeleted: { $ne: true },
    }).select("_id").lean();

    const variantIds = variants.map((variant) => variant._id);
    const supplyLineCount = variantIds.length
      ? await VariantRateModel.countDocuments({
        productVariant: { $in: variantIds },
        isDeleted: { $ne: true },
      })
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        supplyLineCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to load product summary.",
      error: error?.message || "Unknown error",
    });
  }
});
router.get(`${prefix}/products/slug/:slug`, async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase().trim();
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Product slug is required.",
      });
    }

    const product = await ProductModel.findOne({
      slug,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "subCategory",
        select: "name description category",
        populate: { path: "category", select: "name description" },
      })
      .populate("state", "name")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to load product details.",
      error: error?.message || "Unknown error",
    });
  }
});
router.use(`${prefix}/brand`, brandRoutes);
router.use(`${prefix}/demo`, demoRoutes);


// --- Generic CRUD Route (Low Priority / Catch-All) ---
// This will match /:entity and /:entity/:id
// Mounted at prefix directly: /api/v1/web/:entity
router.use(`${prefix}`, genericCrudRoute);

export default router;
