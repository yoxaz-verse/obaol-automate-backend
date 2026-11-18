
import { Router } from "express";
import { getEnquiryTrends, getTopProducts, getSystemMetrics, getAssociateMetrics, getOperatorMetrics, getCompanyFunctionMetrics, getCompanyFunctionComponents, getGlobalCompanyFunctionComponents, getDashboardSummary } from "../controllers/analyticsController";
import authenticateToken from "../middlewares/auth";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { getProductAnalytics, getProductAnalyticsInquiries, getSimilarProducts } from "../controllers/productAnalyticsController";

const router = Router();

// Secure all analytics routes
router.get("/trends/enquiries", authenticateToken, getEnquiryTrends);
router.get("/summary/dashboard", authenticateToken, getDashboardSummary);
router.get("/performance/products", authenticateToken, getTopProducts);
router.get("/metrics/system", authenticateToken, getSystemMetrics);
router.get("/metrics/associate", authenticateToken, getAssociateMetrics);
router.get("/metrics/operator", authenticateToken, getOperatorMetrics);
router.get("/metrics/company-functions", authenticateToken, getCompanyFunctionMetrics);
router.get("/components/company-functions", authenticateToken, getCompanyFunctionComponents);
router.get("/components/company-functions/global", authenticateToken, getGlobalCompanyFunctionComponents);
router.get("/products/:listingId", authenticateToken, authorizeRoles("Admin"), getProductAnalytics);
router.get("/products/:listingId/inquiries", authenticateToken, authorizeRoles("Admin"), getProductAnalyticsInquiries);
router.get("/products/:listingId/similar", authenticateToken, authorizeRoles("Admin"), getSimilarProducts);

export default router;
