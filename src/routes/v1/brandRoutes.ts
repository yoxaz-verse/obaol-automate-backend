import { Router } from "express";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { VariantRateModel } from "../../database/models/variantRate";
import { logError } from "../../utils/errorLogger";

const router = Router();

// Public route to get company details by subdomain, custom domain, or company slug
router.get("/details/:slug", async (req, res) => {
    try {
        const { slug } = req.params;
        const normalizedSlug = slug.toLowerCase();

        // Search by subdomain, customDomain, or company slug
        const company = await AssociateCompanyModel.findOne({
            $or: [
                { subdomain: normalizedSlug },
                { customDomain: normalizedSlug },
                { slug: normalizedSlug }
            ],
            isDeleted: { $ne: true }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: "Brand not found or not published." });
        }

        res.json({ success: true, data: company });
    } catch (error: any) {
        logError(error, req, "BrandRoutes:details");
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Public route to get live products for a company
router.get("/products/:companyId", async (req, res) => {
    try {
        const { companyId } = req.params;

        const products = await VariantRateModel.find({
            associateCompany: companyId,
            isLive: true,
            isDeleted: { $ne: true }
        }).populate("product variant");

        res.json({ success: true, data: products });
    } catch (error: any) {
        logError(error, req, "BrandRoutes:products");
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

export default router;
