import { Request, Response, NextFunction } from "express";
import { CatalogItemModel } from "../database/models/catalogItem";
import { AssociateModel } from "../database/models/associate";
import { VariantRateModel } from "../database/models/variantRate";
import { DisplayedRateModel } from "../database/models/displayedRate";
import mongoose from "mongoose";
import { AssociateReferralService } from "../services/associateReferral.service";
import { CategoryModel } from "../database/models/category";
import { SubCategoryModel } from "../database/models/subCategory";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";
import { assertVariantRateEligible } from "../services/catalogModeration.service";

export class CatalogController {

    private static canReadCatalogNode(row: any, req: Request) {
        const role = String(req.user?.role || "").toLowerCase();
        return role === "admin"
            || String(row?.approvalStatus || "APPROVED") === "APPROVED"
            || (role === "associate" && String(row?.createdByAssociate || "") === String(req.user?.id || ""));
    }

    private static normalizeCatalogName(value: unknown) {
        return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en");
    }

    static async getHierarchyOptions(req: Request, res: Response, next: NextFunction) {
        try {
            res.set({
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
            });

            const filters = ["category", "subCategory", "product"]
                .filter((key) => String(req.query?.[key] || "").trim());
            if (filters.length > 1) {
                return res.status(400).json({ success: false, message: "Provide only one catalog parent filter." });
            }

            const parentKey = filters[0];
            const parentId = parentKey ? String(req.query[parentKey] || "").trim() : "";
            if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
                return res.status(400).json({ success: false, message: `Invalid ${parentKey} id.` });
            }

            let rows: any[] = [];
            let level: "category" | "subCategory" | "product" | "productVariant" = "category";
            let parentName: string | null = null;
            if (!parentKey) {
                const visibility = String(req.user?.role || "").toLowerCase() === "admin" ? {} : {
                    $or: [{ approvalStatus: { $in: ["APPROVED", null] } }, { createdByAssociate: req.user?.id }],
                };
                rows = await CategoryModel.find(visibility).select("_id name approvalStatus createdByAssociate reviewNotes").lean();
            } else if (parentKey === "category") {
                level = "subCategory";
                const parent = await CategoryModel.findById(parentId).select("name approvalStatus createdByAssociate").lean();
                if (!parent || !CatalogController.canReadCatalogNode(parent, req)) return res.status(404).json({ success: false, message: "Category was not found." });
                parentName = String((parent as any).name || "").normalize("NFKC").trim();
                rows = await SubCategoryModel.find({ category: parentId, ...(String(req.user?.role || "").toLowerCase() === "admin" ? {} : { $or: [{ approvalStatus: { $in: ["APPROVED", null] } }, { createdByAssociate: req.user?.id }] }) }).select("_id name category approvalStatus createdByAssociate reviewNotes").lean();
            } else if (parentKey === "subCategory") {
                level = "product";
                const parent = await SubCategoryModel.findById(parentId).select("name approvalStatus createdByAssociate").lean();
                if (!parent || !CatalogController.canReadCatalogNode(parent, req)) return res.status(404).json({ success: false, message: "Subcategory was not found." });
                parentName = String((parent as any).name || "").normalize("NFKC").trim();
                rows = await ProductModel.find({ subCategory: parentId, isDeleted: { $ne: true }, ...(String(req.user?.role || "").toLowerCase() === "admin" ? {} : { $or: [{ approvalStatus: { $in: ["APPROVED", null] } }, { createdByAssociate: req.user?.id }] }) })
                    .select("_id name subCategory approvalStatus createdByAssociate reviewNotes").lean();
            } else {
                level = "productVariant";
                const parent = await ProductModel.findOne({ _id: parentId, isDeleted: { $ne: true } }).select("name approvalStatus createdByAssociate").lean();
                if (!parent || !CatalogController.canReadCatalogNode(parent, req)) return res.status(404).json({ success: false, message: "Product was not found." });
                parentName = String((parent as any).name || "").normalize("NFKC").trim();
                rows = await ProductVariantModel.find({ product: parentId, isDeleted: { $ne: true }, ...(String(req.user?.role || "").toLowerCase() === "admin" ? {} : { $or: [{ approvalStatus: { $in: ["APPROVED", null] } }, { createdByAssociate: req.user?.id }] }) })
                    .select("_id name product approvalStatus createdByAssociate reviewNotes").lean();
            }

            const options = rows
                .map((row: any) => ({
                    id: String(row._id),
                    name: String(row.name || "").normalize("NFKC").trim(),
                    level,
                    parentId: parentKey ? String(row[parentKey] || "") : null,
                    parentName,
                    approvalStatus: String(row.approvalStatus || "APPROVED"),
                    reviewNotes: String(row.reviewNotes || ""),
                }))
                .filter((row) => row.id && row.name)
                .sort((a, b) => CatalogController.normalizeCatalogName(a.name).localeCompare(CatalogController.normalizeCatalogName(b.name), "en"));
            console.info("[catalog-hierarchy] options", {
                role: String(req.user?.role || "unknown").toLowerCase(),
                level,
                parentId: parentId || null,
                resultCount: options.length,
            });
            return res.status(200).json({ success: true, data: options });
        } catch (error) {
            return next(error);
        }
    }

    static async getHierarchyIntegrity(_req: Request, res: Response, next: NextFunction) {
        try {
            const [categories, subCategories, products, variants] = await Promise.all([
                CategoryModel.find({}).select("_id name").lean(),
                SubCategoryModel.find({}).select("_id name category").lean(),
                ProductModel.find({ isDeleted: { $ne: true } }).select("_id name subCategory").lean(),
                ProductVariantModel.find({ isDeleted: { $ne: true } }).select("_id name product").lean(),
            ]);
            const categoryIds = new Set(categories.map((row: any) => String(row._id)));
            const subCategoryIds = new Set(subCategories.map((row: any) => String(row._id)));
            const productIds = new Set(products.map((row: any) => String(row._id)));
            const duplicateGroups = (rows: any[], parentKey?: string) => {
                const groups = new Map<string, string[]>();
                rows.forEach((row: any) => {
                    const key = `${parentKey ? String(row[parentKey] || "") : "root"}:${CatalogController.normalizeCatalogName(row.name)}`;
                    groups.set(key, [...(groups.get(key) || []), String(row._id)]);
                });
                return Array.from(groups.entries()).filter(([, ids]) => ids.length > 1).map(([key, ids]) => ({ key, ids }));
            };
            return res.status(200).json({
                success: true,
                data: {
                    duplicates: {
                        categories: duplicateGroups(categories),
                        subCategories: duplicateGroups(subCategories, "category"),
                        products: duplicateGroups(products, "subCategory"),
                        productVariants: duplicateGroups(variants, "product"),
                    },
                    orphans: {
                        subCategories: subCategories.filter((row: any) => !categoryIds.has(String(row.category))).map((row: any) => String(row._id)),
                        products: products.filter((row: any) => !subCategoryIds.has(String(row.subCategory))).map((row: any) => String(row._id)),
                        productVariants: variants.filter((row: any) => !productIds.has(String(row.product))).map((row: any) => String(row._id)),
                    },
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Add a product to the associate's catalog with a custom margin
     */
    static async addToCatalog(req: Request, res: Response, next: NextFunction) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { productVariantId, baseRateId, margin, customTitle, customDescription } = req.body;
            const associateId = (req.user as any)?.id;

            if (!associateId) {
                throw new Error("Unauthorized: User not found in session");
            }

            // 1. Get Associate & Company details
            const associate = await AssociateModel.findById(associateId).session(session);
            if (!associate) {
                throw new Error("Associate profile was not found");
            }

            // 2. Validate Base Rate
            const baseRate = await VariantRateModel.findById(baseRateId).session(session);
            if (!baseRate) {
                throw new Error("Invalid base rate");
            }

            const hasLinkedCompany = Boolean((associate as any)?.associateCompany);
            const associateIsApproved =
                String((associate as any)?.registrationStatus || "").toUpperCase() === "APPROVED";
            const isOwnRate = String((baseRate as any)?.associate || "") === String(associateId);
            if (!hasLinkedCompany && isOwnRate) {
                const guardedError: any = new Error(
                    "Link a company to add your own rate. You can add marketplace rates to your personal catalog."
                );
                guardedError.status = 403;
                guardedError.statusCode = 403;
                throw guardedError;
            }

            // 3. Check for existing item to prevent duplicates
            // Check if this specific variant rate is already in the associate's catalog
            const existingItem = await CatalogItemModel.findOne({
                associateId,
                baseRateId
            }).session(session);

            if (existingItem) {
                throw new Error("This rate is already in your catalog");
            }

            // 4. Calculate Final Price
            const finalPrice = (baseRate.rate || 0) + (Number(margin) || 0);

            // 5. Create Catalog Item
            const newItem = await CatalogItemModel.create([{
                associateId,
                associateCompanyId: (associate as any).associateCompany || undefined,
                productVariantId,
                baseRateId,
                margin: Number(margin) || 0,
                finalPrice,
                customTitle,
                customDescription,
                isLive: associateIsApproved ? (baseRate.isLive ?? true) : false,
                listingState: associateIsApproved ? "LIVE" : "DRAFT",
                activatedAt: associateIsApproved ? new Date() : null,
                activatedBy: null,
            }], { session });

            // 6. Sync with DisplayedRate (Personal Markup)
            const displayedRateUpdate: any = {
                commission: Number(margin) || 0,
                selected: true
            };
            if ((associate as any).associateCompany) {
                displayedRateUpdate.associateCompany = (associate as any).associateCompany;
            }

            await DisplayedRateModel.findOneAndUpdate(
                { associate: associateId, variantRate: baseRateId },
                displayedRateUpdate,
                { upsert: true, session }
            );

            await session.commitTransaction();
            if (associateIsApproved && newItem[0]?.isLive) {
                await AssociateReferralService.activateCompany(
                    (associate as any).associateCompany,
                    "LIVE_SUPPLY",
                    newItem[0]._id
                );
            }

            res.status(201).json({
                success: true,
                data: newItem[0],
                message: "Product added to catalog successfully"
            });

        } catch (error) {
            await session.abortTransaction();
            next(error);
        } finally {
            session.endSession();
        }
    }

    /**
     * Update margin or details of a catalog item
     */
    static async updateCatalogItem(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { margin, isLive, customTitle, customDescription } = req.body;
            const associateId = (req.user as any)?.id;
            const associate = await AssociateModel.findById(associateId).select("registrationStatus").lean();
            const associateIsApproved =
                String((associate as any)?.registrationStatus || "").toUpperCase() === "APPROVED";

            const item = await CatalogItemModel.findOne({ _id: id, associateId });

            if (!item) {
                return res.status(404).json({ success: false, message: "Item not found" });
            }

            // Update fields if provided
            if (margin !== undefined) {
                const baseRate = await VariantRateModel.findById(item.baseRateId);
                if (baseRate) {
                    item.margin = Number(margin);
                    item.finalPrice = (baseRate.rate || 0) + item.margin;
                }
            }

            if (isLive !== undefined) item.isLive = associateIsApproved ? Boolean(isLive) : false;
            if (customTitle !== undefined) item.customTitle = customTitle;
            if (customDescription !== undefined) item.customDescription = customDescription;

            await item.save();
            if (!associateIsApproved) {
                item.listingState = "DRAFT" as any;
                item.activatedAt = null as any;
                item.activatedBy = null as any;
                item.isLive = false;
                await item.save();
            } else if (item.isLive) {
                item.listingState = "LIVE" as any;
                if (!item.activatedAt) item.activatedAt = new Date();
                await item.save();
            }

            // Sync with DisplayedRate if needed
            if (margin !== undefined || isLive !== undefined) {
                const updateData: any = { selected: true };
                if (margin !== undefined) updateData.commission = item.margin;
                if (isLive !== undefined) updateData.isLive = isLive;

                await DisplayedRateModel.findOneAndUpdate(
                    { associate: associateId, variantRate: item.baseRateId },
                    updateData
                );
            }
            if (associateIsApproved && item.isLive) {
                await AssociateReferralService.activateForAssociate(associateId, "LIVE_SUPPLY", item._id);
            }

            res.status(200).json({
                success: true,
                data: item,
                message: "Catalog item updated"
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove item from catalog
     */
    static async removeFromCatalog(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const associateId = (req.user as any)?.id;

            // 1. Find the item first to get baseRateId
            const item = await CatalogItemModel.findOne({ _id: id, associateId });
            if (!item) {
                return res.status(404).json({ success: false, message: "Item not found" });
            }

            const baseRateId = item.baseRateId;

            // 2. Delete CatalogItem
            await CatalogItemModel.deleteOne({ _id: id });

            // 3. Delete DisplayedRate (Personal Markup)
            await DisplayedRateModel.deleteOne({ associate: associateId, variantRate: baseRateId });

            res.status(200).json({
                success: true,
                message: "Item removed from catalog and personal margins reset"
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove item from catalog by variantRate ID (Marketplace/My Products view)
     */
    static async removeFromCatalogByVariantRate(req: Request, res: Response, next: NextFunction) {
        try {
            const { variantRateId } = req.params;
            const associateId = (req.user as any)?.id;

            // 1. Delete CatalogItem
            await CatalogItemModel.deleteMany({ associateId, baseRateId: variantRateId });

            // 2. Delete DisplayedRate
            await DisplayedRateModel.deleteMany({ associate: associateId, variantRate: variantRateId });

            res.status(200).json({
                success: true,
                message: "Product removed from catalog"
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Public: Get all items for a specific company (by slug or ID)
     */
    static async getPublicCatalog(req: Request, res: Response, next: NextFunction) {
        try {
            const { companySlug } = req.params;

            // TODO: Lookup logic for company ID from slug would go here
            // For now, assuming companySlug might be the ID directly or we need a lookup helper
            // This part requires the AssociateCompany model to be queryable by slug.

            // Placeholder: Fetch based on associateCompanyId directly if passed, or implement lookup
            // Implementation depends on how we resolve slug -> ID.

            // Let's assume for this step we will query by ID until slug lookup is fully integrated
            // OR we can query AssociateCompany by slug first.
            const associateCompany = await mongoose.model("AssociateCompany").findOne({ slug: companySlug, registrationStatus: "APPROVED", isApproved: true, isDeleted: { $ne: true } });

            if (!associateCompany) {
                return res.status(404).json({ success: false, message: "Company not found" });
            }

            const items = await CatalogItemModel.find({
                associateCompanyId: associateCompany._id,
                isLive: true
            })
                .populate("productVariantId")
                .populate("baseRateId")
                .sort({ createdAt: -1 });

            const eligibleItems = [];
            for (const item of items as any[]) {
                try { await assertVariantRateEligible(item.baseRateId); eligibleItems.push(item); } catch { /* intentionally hidden */ }
            }
            res.status(200).json({
                success: true,
                data: eligibleItems,
                company: {
                    name: associateCompany.name,
                    slug: associateCompany.slug,
                    isWebsiteLive: associateCompany.isWebsiteLive
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Public: Get specific product details from associate catalog
     */
    static async getPublicProductDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const { companySlug, productSlug } = req.params;

            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            // 1. Find Company
            const associateCompany = await mongoose.model("AssociateCompany").findOne({ slug: companySlug, registrationStatus: "APPROVED", isApproved: true, isDeleted: { $ne: true } });
            if (!associateCompany) {
                return res.status(404).json({ success: false, message: "Company not found" });
            }

            // 2. Find Product Variant by Slug (to get ID)
            let productVariant = await mongoose.model("ProductVariant").findOne({ slug: productSlug });

            let catalogItem;

            if (productVariant) {
                // Found by slug
                catalogItem = await CatalogItemModel.findOne({
                    associateCompanyId: associateCompany._id,
                    productVariantId: productVariant._id,
                    isLive: true,
                    updatedAt: { $gte: startOfToday }
                })
                    .populate({
                        path: "productVariantId",
                        populate: { path: "product" }
                    })
                    .populate("baseRateId");
            } else if (mongoose.Types.ObjectId.isValid(productSlug)) {
                // Try finding by ID directly (CatalogItem ID or ProductVariant ID)
                catalogItem = await CatalogItemModel.findOne({
                    _id: productSlug,
                    associateCompanyId: associateCompany._id,
                    isLive: true,
                    updatedAt: { $gte: startOfToday }
                })
                    .populate({
                        path: "productVariantId",
                        populate: { path: "product" }
                    })
                    .populate("baseRateId");

                if (!catalogItem) {
                    // Check if it was a ProductVariant ID
                    catalogItem = await CatalogItemModel.findOne({
                        associateCompanyId: associateCompany._id,
                        productVariantId: productSlug,
                        isLive: true,
                        updatedAt: { $gte: startOfToday }
                    })
                        .populate({
                            path: "productVariantId",
                            populate: { path: "product" }
                        })
                        .populate("baseRateId");
                }
            }

            if (!catalogItem) {
                return res.status(404).json({ success: false, message: "Product not found in this catalog" });
            }

            try {
                await assertVariantRateEligible((catalogItem as any).baseRateId);
            } catch {
                return res.status(404).json({ success: false, message: "Product not found in this catalog" });
            }

            res.status(200).json({
                success: true,
                data: catalogItem,
                company: {
                    name: associateCompany.name,
                    slug: associateCompany.slug
                }
            });

        } catch (error) {
            next(error);
        }
    }
}
