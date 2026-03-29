import { Router } from "express";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { VariantRateModel } from "../../database/models/variantRate";
import { CatalogItemModel } from "../../database/models/catalogItem";
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

        const rateRows = await VariantRateModel.find({
            associateCompany: companyId,
            isDeleted: { $ne: true }
        })
            .populate({
                path: "productVariant",
                populate: { path: "product" }
            })
            .lean();

        const catalogRows = await CatalogItemModel.find({
            associateCompanyId: companyId,
            isLive: true
        })
            .populate({
                path: "productVariantId",
                populate: { path: "product" }
            })
            .lean();

        const productMap = new Map<
            string,
            { productId: string; productName: string; variants: Map<string, { id: string; name: string }> }
        >();

        const addVariant = (productId?: any, productName?: any, variantId?: any, variantName?: any) => {
            const pid = String(productId || "");
            const vid = String(variantId || "");
            if (!pid || !vid) return;
            if (!productMap.has(pid)) {
                productMap.set(pid, {
                    productId: pid,
                    productName: String(productName || "").trim() || "Product",
                    variants: new Map(),
                });
            }
            const entry = productMap.get(pid)!;
            if (!entry.variants.has(vid)) {
                entry.variants.set(vid, {
                    id: vid,
                    name: String(variantName || "").trim() || "Variant",
                });
            }
        };

        rateRows.forEach((row: any) => {
            const variant = row?.productVariant;
            addVariant(variant?.product?._id, variant?.product?.name, variant?._id, variant?.name);
        });

        catalogRows.forEach((row: any) => {
            const variant = row?.productVariantId;
            addVariant(variant?.product?._id, variant?.product?.name, variant?._id, variant?.name);
        });

        const products = Array.from(productMap.values()).map((entry) => ({
            productId: entry.productId,
            productName: entry.productName,
            variants: Array.from(entry.variants.values()),
        }));

        res.json({ success: true, data: { products } });
    } catch (error: any) {
        logError(error, req, "BrandRoutes:products");
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

export default router;
