import { Router } from "express";

import authRoute from "./authRoute";
import verifyTokenRoute from "./verifyTokenRoute";
import verificationRoutes from "./verificationRoutes";
import genericCrudRoute from "./genericCrudRoute";
import {
  calculateCIF,
  calculateDomesticCost,
} from "../controllers/cif.controller";

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

// Logistics / Calculation (Custom Controllers)
router.post(`${prefix}/cif`, calculateCIF);
router.post(`${prefix}/cif/domestic`, calculateDomesticCost);

// Catalog Management (Associate)
import catalogRoutes from "./v1/catalogRoutes";
router.use(`${prefix}/catalog`, catalogRoutes);

// Diagnostic Routes (Development)
import diagnosticRoutes from "./diagnosticRoutes";
router.use(`${prefix}/diagnostic`, diagnosticRoutes);

// Public Routes (No Auth)
import { GenericCrudController } from "../controllers/genericCrudController";
const publicCrud = new GenericCrudController();
router.get(`${prefix}/products`, (req, res, next) => { (req.params as any).entity = "products"; next(); }, publicCrud.handleRequest.bind(publicCrud));


// --- Generic CRUD Route (Low Priority / Catch-All) ---
// This will match /:entity and /:entity/:id
// Mounted at prefix directly: /api/v1/web/:entity
router.use(`${prefix}`, genericCrudRoute);

export default router;
