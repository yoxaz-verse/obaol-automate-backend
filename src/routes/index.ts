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

// Logistics / Calculation (Custom Controllers)
router.post(`${prefix}/cif`, calculateCIF);
router.post(`${prefix}/cif/domestic`, calculateDomesticCost);


// --- Generic CRUD Route (Low Priority / Catch-All) ---
// This will match /:entity and /:entity/:id
// Mounted at prefix directly: /api/v1/web/:entity
router.use(`${prefix}`, genericCrudRoute);

export default router;
