
import { Router } from "express";
import { getEnquiryTrends, getTopProducts, getSystemMetrics, getAssociateMetrics, getOperatorMetrics, getCompanyFunctionMetrics, getCompanyFunctionComponents, getGlobalCompanyFunctionComponents } from "../controllers/analyticsController";
import authenticateToken from "../middlewares/auth";

const router = Router();

// Secure all analytics routes
router.get("/trends/enquiries", authenticateToken, getEnquiryTrends);
router.get("/performance/products", authenticateToken, getTopProducts);
router.get("/metrics/system", authenticateToken, getSystemMetrics);
router.get("/metrics/associate", authenticateToken, getAssociateMetrics);
router.get("/metrics/operator", authenticateToken, getOperatorMetrics);
router.get("/metrics/company-functions", authenticateToken, getCompanyFunctionMetrics);
router.get("/components/company-functions", authenticateToken, getCompanyFunctionComponents);
router.get("/components/company-functions/global", authenticateToken, getGlobalCompanyFunctionComponents);

export default router;
