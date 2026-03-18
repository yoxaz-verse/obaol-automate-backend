import { Request, Response, NextFunction } from "express";
import { CatalogItemModel } from "../database/models/catalogItem";
import { AssociateModel } from "../database/models/associate";
import { VariantRateModel } from "../database/models/variantRate";
import { DisplayedRateModel } from "../database/models/displayedRate";
import mongoose from "mongoose";

export class CatalogController {

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
                isLive: baseRate.isLive ?? true
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

            if (isLive !== undefined) item.isLive = isLive;
            if (customTitle !== undefined) item.customTitle = customTitle;
            if (customDescription !== undefined) item.customDescription = customDescription;

            await item.save();

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
            const associateCompany = await mongoose.model("AssociateCompany").findOne({ slug: companySlug });

            if (!associateCompany) {
                return res.status(404).json({ success: false, message: "Company not found" });
            }

            const items = await CatalogItemModel.find({
                associateCompanyId: associateCompany._id,
                isLive: true
            })
                .populate("productVariantId")
                .sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                data: items,
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
            const associateCompany = await mongoose.model("AssociateCompany").findOne({ slug: companySlug });
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
                    });
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
                    });

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
                        });
                }
            }

            if (!catalogItem) {
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
