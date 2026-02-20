
import { Router } from "express";
import { getEnquiryTrends, getTopProducts, getSystemMetrics, getAssociateMetrics } from "../controllers/analyticsController";
import authenticateToken from "../middlewares/auth";

const router = Router();

// Secure all analytics routes
router.get("/trends/enquiries", authenticateToken, getEnquiryTrends);
router.get("/performance/products", authenticateToken, getTopProducts);
router.get("/metrics/system", authenticateToken, getSystemMetrics);
router.get("/metrics/associate", authenticateToken, getAssociateMetrics);

export default router;
