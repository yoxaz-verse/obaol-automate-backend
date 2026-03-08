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

// Organization reports (custom admin actions + generic CRUD via catch-all)
import organizationReportRoutes from "./v1/organizationReportRoutes";
router.use(`${prefix}/organization-reports`, organizationReportRoutes);

// Employee hierarchy + commissions (exact + aliased paths)
import employeeHierarchyRoutes from "./v1/employeeHierarchyRoutes";
import commissionRoutes from "./v1/commissionRoutes";
router.use("/employees", employeeHierarchyRoutes);
router.use("/commissions", commissionRoutes);
router.use(`${prefix}/employees`, employeeHierarchyRoutes);
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
const publicCrud = new GenericCrudController();
router.get(`${prefix}/products`, (req, res, next) => { (req.params as any).entity = "products"; next(); }, publicCrud.handleRequest.bind(publicCrud));
router.use(`${prefix}/brand`, brandRoutes);


// --- Generic CRUD Route (Low Priority / Catch-All) ---
// This will match /:entity and /:entity/:id
// Mounted at prefix directly: /api/v1/web/:entity
router.use(`${prefix}`, genericCrudRoute);

export default router;
