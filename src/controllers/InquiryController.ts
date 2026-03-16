import { Request, Response, NextFunction } from "express";
import { InquiryModel } from "../database/models/enquiry";
import {
    InquiryEventModel,
    createInquiryEvent,
    InquiryEventType
} from "../database/models/InquiryEvent";
import {
    InquiryStatus,
    validateInquiryTransition,
    InvalidTransitionError,
    isValidInquiryStatus
} from "../core/inquiry/inquiryStateMachine";
import {
    canAccessInquiry,
    filterInquiryFields,
    buildInquiryAccessFilter,
    InquiryAccessContext,
    UserRole,
    getAssociateRole
} from "../core/inquiry/inquiryAccessControl";
import { Types } from "mongoose";
import { VariantRateModel } from "../database/models/variantRate";
import { CatalogItemModel } from "../database/models/catalogItem";
import { CountryModel } from "../database/models/country";
import { StateModel } from "../database/models/state";
import { DistrictModel } from "../database/models/district";
import { UnLoCodeModel } from "../database/models/unLoCode";
import { UnLoCodeFunctionsModel } from "../database/models/unLoCodeFunction";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateModel } from "../database/models/associate";
import { InventoryModel } from "../database/models/inventory";
import { InventoryReservationModel } from "../database/models/inventoryReservation";
import { OrderModel } from "../database/models/order";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { DocumentRuleModel } from "../database/models/documentRule";
import { EnquiryRuleModel } from "../database/models/enquiryRule";
import { ensureDefaultEnquiryRules } from "../utils/enquiryRules";
import { notificationService } from "../services/notificationService";
import { NotificationEntityTypes, NotificationTypes } from "../constants/notificationTypes";
import { TradeDocumentController } from "./tradeDocumentController";

/**
 * Inquiry Controller
 * Implements business logic with state machine and access control
 */
export class InquiryController {
    private tradeDocController = new TradeDocumentController();
    private async notifyInquiryParticipants(params: {
        inquiry: any;
        actorId?: string | null;
        type: string;
        title: string;
        message: string;
        route?: string;
        payload?: Record<string, any>;
        priority?: "low" | "medium" | "high";
    }) {
        const recipients = await notificationService.buildInquiryRecipients(params.inquiry);
        notificationService.removeActor(recipients, params.actorId || null);
        const inquiryId = String(params.inquiry?._id || "");
        if (!inquiryId) return;
        await notificationService.createNotifications({
            recipientMap: recipients,
            createdByUserId: params.actorId || null,
            type: params.type,
            title: params.title,
            message: params.message,
            entityType: NotificationEntityTypes.INQUIRY,
            entityId: inquiryId,
            route: params.route || `/dashboard/enquiries/${inquiryId}`,
            payload: { inquiryId, ...(params.payload || {}) },
            priority: params.priority || "medium",
        });
    }

    private buildAccessContext(req: Request): InquiryAccessContext {
        return {
            userId: req.user!.id,
            userRole: req.user!.role,
            associateId: (req.user as any).associateId || (req.user!.role === UserRole.ASSOCIATE ? req.user!.id : null),
            associateCompanyId: (req.user as any)?.associateCompany || null,
        };
    }

    private async getCapabilityMatchedProviderIds(type: string): Promise<string[]> {
        const rows = await AssociateCompanyModel.find({
            isDeleted: { $ne: true },
            serviceCapabilities: { $in: [String(type || "").toUpperCase()] },
        })
            .select("_id")
            .limit(5000)
            .lean();
        return rows.map((row: any) => String(row._id));
    }

    /**
     * List only sea ports (UN/LOCODE function code "1")
     * GET /api/v1/web/inquiries/sea-ports?country=...
     */
    async listSeaPorts(req: Request, res: Response, next: NextFunction) {
        try {
            const country = String(req.query.country || "");
            const page = Math.max(parseInt(String(req.query.page || "1"), 10), 1);
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || "200"), 10), 1), 2000);

            const seaPortFn = await UnLoCodeFunctionsModel.findOne({ code: "1", isDeleted: false }).select("_id");
            if (!seaPortFn?._id) {
                return res.json({
                    success: true,
                    data: { data: [], page, limit, total: 0, pages: 0 },
                });
            }

            const query: any = { isDeleted: false };
            if (country && Types.ObjectId.isValid(country)) {
                query.country = new Types.ObjectId(country);
            }
            const rawRows = await UnLoCodeModel.find(query)
                .select("name loCode country functions status")
                .populate("country", "name")
                .populate("functions", "code name")
                .sort({ name: 1 })
                .limit(5000);

            // Strictly keep only maritime sea ports (UN/LOCODE function code "1")
            const seaRows = rawRows.filter((row: any) => {
                const functions = Array.isArray(row?.functions) ? row.functions : [];
                return functions.some((fn: any) => {
                    const code = String(fn?.code || "");
                    const id = String(fn?._id || fn || "");
                    return code === "1" || id === String(seaPortFn._id);
                });
            });
            const total = seaRows.length;
            const skip = (page - 1) * limit;
            const rows = seaRows.slice(skip, skip + limit);

            res.json({
                success: true,
                data: {
                    data: rows,
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Create a new inquiry
     * POST /api/v1/web/inquiries
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                productId,
                quantity,
                specifications,
                packagingSpecifications,
                buyerAssociateId,
                sellerAssociateId,
                mediatorAssociateId,
                assignedOperatorId,
                variantRateId,
                catalogItemId,
                preferredIncoterm,
                supplierCommitUntil,
                notes
            } = req.body;
            let { rate, adminCommission, mediatorCommission } = req.body;
            const roleLower = String(req.user?.role || "").toLowerCase();
            const isOperatorCreator = roleLower === "operator" || roleLower === "team";
            const normalizedAssignedOperatorId = isOperatorCreator
                ? req.user!.id
                : (assignedOperatorId || null);

            // Validation
            if (!productId || !buyerAssociateId || !sellerAssociateId) {
                return res.status(400).json({
                    success: false,
                    message: "productId, buyerAssociateId, and sellerAssociateId are required"
                });
            }

            // Backend Rate & Commission Lookup
            if (catalogItemId) {
                const catalogItem = await CatalogItemModel.findById(catalogItemId).populate("baseRateId");
                if (catalogItem) {
                    const baseRate = catalogItem.baseRateId as any;
                    rate = baseRate?.rate || 0;
                    adminCommission = baseRate?.commission || 0;
                    mediatorCommission = catalogItem.margin || 0;
                }
            } else if (variantRateId) {
                const variantRate = await VariantRateModel.findById(variantRateId);
                if (variantRate) {
                    rate = variantRate.rate || 0;
                    adminCommission = variantRate.commission || 0;
                    mediatorCommission = 0;
                }
            }

            // Create inquiry
            const inquiry = await InquiryModel.create({
                productId,
                quantity,
                specifications,
                packagingSpecifications,
                buyerAssociateId,
                sellerAssociateId,
                mediatorAssociateId,
                assignedOperatorId: normalizedAssignedOperatorId,
                variantRateId,
                catalogItemId,
                preferredIncoterm,
                supplierCommitUntil,
                rate,
                adminCommission,
                mediatorCommission,
                notes,
                status: InquiryStatus.NEW,
                createdBy: req.user!.id
            });

            // Log creation event
            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.CREATED,
                req.user!.id,
                { metadata: { status: InquiryStatus.NEW } }
            );

            // Populate relations
            await inquiry.populate([
                { path: "productId", select: "name description" },
                {
                    path: "variantRateId",
                    select: "productVariant rate commission",
                    populate: {
                        path: "productVariant",
                        select: "name product",
                        populate: { path: "product", select: "name" }
                    }
                },
                {
                    path: "catalogItemId",
                    select: "productVariantId baseRateId finalPrice margin",
                    populate: [
                        {
                            path: "productVariantId",
                            select: "name product",
                            populate: { path: "product", select: "name" }
                        },
                        {
                            path: "baseRateId",
                            select: "rate commission"
                        }
                    ]
                },
                {
                    path: "buyerAssociateId",
                    select: "name email phone associateCompany",
                    populate: { path: "associateCompany", select: "name" }
                },
                {
                    path: "sellerAssociateId",
                    select: "name email phone associateCompany",
                    populate: { path: "associateCompany", select: "name" }
                },
                {
                    path: "mediatorAssociateId",
                    select: "name email phone associateCompany",
                    populate: { path: "associateCompany", select: "name" }
                },
                { path: "assignedOperatorId", select: "name email" }
            ]);

            await this.notifyInquiryParticipants({
                inquiry,
                actorId: req.user!.id,
                type: NotificationTypes.INQUIRY_CREATED,
                title: "New inquiry created",
                message: "A new inquiry relevant to your trade flow was created.",
                payload: { status: InquiryStatus.NEW },
                priority: "high",
            });

            res.status(201).json({
                success: true,
                data: inquiry
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Seller commits the inquiry until a specific date (price/stock commitment)
     * PATCH /api/v1/web/inquiries/:id/commit
     */
    async commitUntil(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { commitUntil } = req.body;

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inquiry ID"
                });
            }

            if (!commitUntil) {
                return res.status(400).json({
                    success: false,
                    message: "commitUntil is required"
                });
            }

            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Inquiry not found"
                });
            }

            const context: InquiryAccessContext = this.buildAccessContext(req);

            if (!canAccessInquiry(inquiry as any, context)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Only seller associate, admin, or assigned operator can commit
            const isAdmin = req.user!.role === UserRole.ADMIN;
            const isAssignedOperator =
                (req.user!.role === UserRole.OPERATOR || req.user!.role === "team") &&
                inquiry.assignedOperatorId?.toString() === req.user!.id;

            let isSeller = false;
            if (req.user!.role === UserRole.ASSOCIATE && context.associateId) {
                const role = getAssociateRole(inquiry as any, context.associateId);
                isSeller = role === "seller";
            }

            if (!isAdmin && !isAssignedOperator && !isSeller) {
                return res.status(403).json({
                    success: false,
                    message: "Only the supplier, assigned operator, or admin can commit this inquiry"
                });
            }

            const previousValue = inquiry.supplierCommitUntil
                ? inquiry.supplierCommitUntil.toISOString()
                : null;

            inquiry.supplierCommitUntil = new Date(commitUntil);
            await inquiry.save();

            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.UPDATED,
                req.user!.id,
                {
                    previousValue,
                    newValue: inquiry.supplierCommitUntil.toISOString(),
                    metadata: { field: "supplierCommitUntil" }
                }
            );

            res.json({
                success: true,
                data: inquiry,
                message: "Inquiry committed until date updated"
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Seller accepts the inquiry
     * PATCH /api/v1/web/inquiries/:id/seller-accept
     */
    async sellerAccept(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { inventoryId } = req.body || {};

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inquiry ID"
                });
            }

            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Inquiry not found"
                });
            }

            const context: InquiryAccessContext = this.buildAccessContext(req);

            if (!canAccessInquiry(inquiry as any, context)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            let isSeller = false;
            if (req.user!.role === UserRole.ASSOCIATE && context.associateId) {
                const role = getAssociateRole(inquiry as any, context.associateId);
                isSeller = role === "seller";
            }

            const isAdmin = req.user!.role === UserRole.ADMIN;

            if (!isSeller && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: "Only the supplier or admin can accept this inquiry"
                });
            }

            if (inquiry.sellerAcceptedAt) {
                return res.json({
                    success: true,
                    data: inquiry,
                    message: "Inquiry already accepted by supplier"
                });
            }

            if (!inventoryId || !Types.ObjectId.isValid(String(inventoryId))) {
                return res.status(400).json({
                    success: false,
                    message: "Inventory selection is required for supplier acceptance."
                });
            }

            const inventory = await InventoryModel.findById(inventoryId).lean();
            if (!inventory || (inventory as any).isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Selected inventory not found."
                });
            }

            const sellerAssociate = await AssociateModel.findById(inquiry.sellerAssociateId)
                .select("_id associateCompany")
                .lean();
            const sellerCompanyId = (sellerAssociate as any)?.associateCompany;
            if (!sellerCompanyId) {
                return res.status(400).json({
                    success: false,
                    message: "Supplier company is missing for this inquiry."
                });
            }

            if (String(sellerCompanyId) !== String((inventory as any).associateCompany || "")) {
                return res.status(400).json({
                    success: false,
                    message: "Selected inventory does not belong to the supplier company."
                });
            }

            const variantRateId = inquiry.variantRateId;
            const variantRate = variantRateId
                ? await VariantRateModel.findById(variantRateId).select("productVariant").lean()
                : null;
            const productVariantId = variantRate?.productVariant;
            if (!productVariantId) {
                return res.status(400).json({
                    success: false,
                    message: "Product variant is required to reserve inventory."
                });
            }

            const qty = Number((inquiry as any)?.quantity || 0);
            if (!qty || Number.isNaN(qty) || qty <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Inquiry quantity must be greater than 0 to reserve inventory."
                });
            }

            const reservedAgg = await InventoryReservationModel.aggregate([
                { $match: { inventoryId: inventory._id, status: "RESERVED", isDeleted: { $ne: true } } },
                { $group: { _id: "$inventoryId", qty: { $sum: "$quantity" } } }
            ]);
            const reservedQty = reservedAgg?.[0]?.qty || 0;
            const availableQty = Math.max(0, Number((inventory as any).quantity || 0) - reservedQty);
            if (qty > availableQty) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${availableQty} MT is available in the selected inventory.`
                });
            }

            inquiry.sellerAcceptedAt = new Date();
            await inquiry.save();

            const reservation = await InventoryReservationModel.create({
                inventoryId: inventory._id,
                enquiryId: inquiry._id,
                productVariant: productVariantId,
                associateCompany: sellerCompanyId,
                quantity: qty,
                status: "RESERVED",
                reservedAt: new Date(),
            });

            try {
                await this.tradeDocController.autoCreateQuotationForInquiry(
                    inquiry._id,
                    reservation?._id || null
                );
            } catch {
                // Do not block seller acceptance if document creation fails.
            }

            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.UPDATED,
                req.user!.id,
                {
                    metadata: { action: "SELLER_ACCEPTED" }
                }
            );

            await this.notifyInquiryParticipants({
                inquiry,
                actorId: req.user!.id,
                type: NotificationTypes.INQUIRY_SUPPLIER_ACCEPTED,
                title: "Supplier accepted inquiry",
                message: "Supplier has accepted the inquiry. Move to next confirmation steps.",
                payload: { action: "SELLER_ACCEPTED" },
                priority: "high",
            });

            res.json({
                success: true,
                data: inquiry,
                message: "Inquiry accepted by supplier"
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Buyer confirms everything is good to go
     * PATCH /api/v1/web/inquiries/:id/buyer-confirm
     */
    async buyerConfirm(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inquiry ID"
                });
            }

            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Inquiry not found"
                });
            }

            const context: InquiryAccessContext = this.buildAccessContext(req);

            if (!canAccessInquiry(inquiry as any, context)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            let isBuyer = false;
            if (req.user!.role === UserRole.ASSOCIATE && context.associateId) {
                const role = getAssociateRole(inquiry as any, context.associateId);
                isBuyer = role === "buyer";
            }

            const isAdmin = req.user!.role === UserRole.ADMIN;

            if (!isBuyer && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: "Only the buyer or admin can confirm this inquiry"
                });
            }

            if (inquiry.buyerConfirmedAt) {
                return res.json({
                    success: true,
                    data: inquiry,
                    message: "Inquiry already confirmed by buyer"
                });
            }

            inquiry.buyerConfirmedAt = new Date();
            await inquiry.save();

            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.UPDATED,
                req.user!.id,
                {
                    metadata: { action: "BUYER_CONFIRMED" }
                }
            );

            res.json({
                success: true,
                data: inquiry,
                message: "Inquiry confirmed by buyer"
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Finalize responsibilities and generate execution inquiries
     * PATCH /api/v1/web/inquiries/:id/finalize-responsibilities
     */
    async finalizeResponsibilities(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "Invalid inquiry ID" });
            }

            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({ success: false, message: "Inquiry not found" });
            }

            const context: InquiryAccessContext = this.buildAccessContext(req);

            if (!canAccessInquiry(inquiry as any, context)) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            const isAdmin = req.user!.role === UserRole.ADMIN;
            let isBuyerOrSeller = false;
            if (req.user!.role === UserRole.ASSOCIATE && context.associateId) {
                const role = getAssociateRole(inquiry as any, context.associateId);
                isBuyerOrSeller = role === "buyer" || role === "seller";
            }
            if (!isAdmin && !isBuyerOrSeller) {
                return res.status(403).json({
                    success: false,
                    message: "Only admin, buyer, or supplier can finalize responsibilities"
                });
            }

            if (!inquiry.sellerAcceptedAt || !inquiry.buyerConfirmedAt) {
                return res.status(400).json({
                    success: false,
                    message: "Supplier acceptance and buyer confirmation are required before finalization"
                });
            }

            const planRaw: any = inquiry.responsibilityPlan || {};
            const plan: any = {
                ...planRaw,
                exportCustomsBy: planRaw.exportCustomsBy || planRaw.certificateBy || "obaol",
                cargoInsuranceBy: planRaw.cargoInsuranceBy || planRaw.shippingBy || "obaol",
                importCustomsBy: planRaw.importCustomsBy || "buyer",
                dutiesTaxesBy: planRaw.dutiesTaxesBy || "buyer",
                portHandlingBy: planRaw.portHandlingBy || "buyer",
                destinationInlandTransportBy: planRaw.destinationInlandTransportBy || "buyer",
                destinationInspectionBy: planRaw.destinationInspectionBy || "buyer",
                finalDeliveryConfirmationBy: planRaw.finalDeliveryConfirmationBy || "obaol",
            };

            const bodyContext = req.body?.executionContext || {};
            const packagingSpecifications = String(
                req.body?.packagingSpecifications ?? (inquiry as any)?.packagingSpecifications ?? ""
            ).trim();
            if (!packagingSpecifications) {
                return res.status(400).json({
                    success: false,
                    message: "Packaging specifications are required before finalizing responsibilities",
                });
            }
            const mergedContext: any = {
                ...(inquiry as any).executionContext,
                ...bodyContext,
            };
            const tradeType = String(mergedContext.tradeType || "DOMESTIC").toUpperCase() === "INTERNATIONAL"
                ? "INTERNATIONAL"
                : "DOMESTIC";
            mergedContext.tradeType = tradeType;
            const isIndiaName = (name: any) => String(name || "").trim().toLowerCase() === "india";
            let isFromIndia = false;
            let isToIndia = false;
            if (tradeType === "INTERNATIONAL") {
                const [originCountryRef, destinationCountryRef] = await Promise.all([
                    mergedContext.originCountry && Types.ObjectId.isValid(String(mergedContext.originCountry))
                        ? CountryModel.findById(mergedContext.originCountry).select("name")
                        : null,
                    mergedContext.destinationCountry && Types.ObjectId.isValid(String(mergedContext.destinationCountry))
                        ? CountryModel.findById(mergedContext.destinationCountry).select("name")
                        : null,
                ]);
                isFromIndia = isIndiaName((originCountryRef as any)?.name) || isIndiaName(mergedContext.originCountryName);
                isToIndia = isIndiaName((destinationCountryRef as any)?.name) || isIndiaName(mergedContext.destinationCountryName);
            }

            const allowedByKey: Record<string, Set<string>> = {
                procurementBy: new Set(["buyer", "seller", "obaol"]),
                qualityTestingBy: new Set(["buyer", "seller", "obaol"]),
                packagingBy: new Set(["buyer", "seller", "obaol"]),
                transportBy: new Set(["buyer", "seller", "obaol"]),
                shippingBy: new Set(["buyer", "seller", "obaol"]),
                cargoInsuranceBy: new Set(["buyer", "seller", "obaol"]),
                exportCustomsBy: new Set(["buyer", "seller", "obaol"]),
                importCustomsBy: new Set(["buyer", "obaol"]),
                dutiesTaxesBy: new Set(["buyer"]),
                portHandlingBy: new Set(["buyer", "obaol"]),
                destinationInlandTransportBy: new Set(["buyer", "obaol"]),
                destinationInspectionBy: new Set(["buyer", "obaol"]),
                finalDeliveryConfirmationBy: new Set(["obaol"]),
            };
            const domesticRequiredKeys = [
                "procurementBy",
                "qualityTestingBy",
                "packagingBy",
                "transportBy",
            ];
            const internationalRequiredKeys = [
                "shippingBy",
                ...(isFromIndia ? ["exportCustomsBy"] : []),
                ...(isToIndia
                    ? [
                        "importCustomsBy",
                        "dutiesTaxesBy",
                        "portHandlingBy",
                        "destinationInlandTransportBy",
                        "destinationInspectionBy",
                        "finalDeliveryConfirmationBy",
                    ]
                    : []),
            ];
            const requiredPlanKeys = tradeType === "INTERNATIONAL"
                ? [...domesticRequiredKeys, ...internationalRequiredKeys]
                : domesticRequiredKeys;
            for (const key of requiredPlanKeys) {
                const value = String(plan[key] || "");
                if (!allowedByKey[key]?.has(value)) {
                    return res.status(400).json({
                        success: false,
                        message: `Responsibility plan is incomplete or invalid: ${key}`
                    });
                }
            }

            if (tradeType === "DOMESTIC") {
                if (!mergedContext.originState || !mergedContext.destinationState) {
                    return res.status(400).json({
                        success: false,
                        message: "Domestic trade requires originState and destinationState"
                    });
                }
                if (!mergedContext.originDistrict || !mergedContext.destinationDistrict) {
                    return res.status(400).json({
                        success: false,
                        message: "Domestic trade requires originDistrict and destinationDistrict"
                    });
                }
                mergedContext.originCountry = null;
                mergedContext.destinationCountry = null;
                mergedContext.originPort = null;
                mergedContext.destinationPort = null;
            } else {
                if (!mergedContext.originCountry || !mergedContext.destinationCountry) {
                    return res.status(400).json({
                        success: false,
                        message: "International trade requires originCountry and destinationCountry"
                    });
                }
                if (!mergedContext.originPort || !mergedContext.destinationPort) {
                    return res.status(400).json({
                        success: false,
                        message: "International trade requires originPort and destinationPort"
                    });
                }
                mergedContext.originState = null;
                mergedContext.destinationState = null;
                mergedContext.originDistrict = null;
                mergedContext.destinationDistrict = null;
            }

            if ((inquiry as any).responsibilitiesFinalizedAt) {
                return res.json({
                    success: true,
                    data: inquiry,
                    message: "Responsibilities already finalized"
                });
            }

            const [originCountryDoc, destinationCountryDoc, originStateDoc, destinationStateDoc, originDistrictDoc, destinationDistrictDoc, originPortDoc, destinationPortDoc] = await Promise.all([
                mergedContext.originCountry && Types.ObjectId.isValid(String(mergedContext.originCountry))
                    ? CountryModel.findById(mergedContext.originCountry).select("name")
                    : null,
                mergedContext.destinationCountry && Types.ObjectId.isValid(String(mergedContext.destinationCountry))
                    ? CountryModel.findById(mergedContext.destinationCountry).select("name")
                    : null,
                mergedContext.originState && Types.ObjectId.isValid(String(mergedContext.originState))
                    ? StateModel.findById(mergedContext.originState).select("name")
                    : null,
                mergedContext.destinationState && Types.ObjectId.isValid(String(mergedContext.destinationState))
                    ? StateModel.findById(mergedContext.destinationState).select("name")
                    : null,
                mergedContext.originDistrict && Types.ObjectId.isValid(String(mergedContext.originDistrict))
                    ? DistrictModel.findById(mergedContext.originDistrict).select("name")
                    : null,
                mergedContext.destinationDistrict && Types.ObjectId.isValid(String(mergedContext.destinationDistrict))
                    ? DistrictModel.findById(mergedContext.destinationDistrict).select("name")
                    : null,
                mergedContext.originPort && Types.ObjectId.isValid(String(mergedContext.originPort))
                    ? UnLoCodeModel.findById(mergedContext.originPort).select("name loCode")
                    : null,
                mergedContext.destinationPort && Types.ObjectId.isValid(String(mergedContext.destinationPort))
                    ? UnLoCodeModel.findById(mergedContext.destinationPort).select("name loCode")
                    : null,
            ]);

            const routeFrom =
                tradeType === "INTERNATIONAL"
                    ? [originPortDoc ? `${(originPortDoc as any).name} (${(originPortDoc as any).loCode})` : null, originCountryDoc ? (originCountryDoc as any).name : null]
                        .filter(Boolean)
                        .join(", ")
                    : [originDistrictDoc ? (originDistrictDoc as any).name : null, originStateDoc ? (originStateDoc as any).name : null]
                        .filter(Boolean)
                        .join(", ");
            const routeTo =
                tradeType === "INTERNATIONAL"
                    ? [destinationPortDoc ? `${(destinationPortDoc as any).name} (${(destinationPortDoc as any).loCode})` : null, destinationCountryDoc ? (destinationCountryDoc as any).name : null]
                        .filter(Boolean)
                        .join(", ")
                    : [destinationDistrictDoc ? (destinationDistrictDoc as any).name : null, destinationStateDoc ? (destinationStateDoc as any).name : null]
                        .filter(Boolean)
                        .join(", ");
            const baseDetails = {
                tradeType,
                from: routeFrom,
                to: routeTo,
                routeNotes: mergedContext.routeNotes || "",
                requiresShipping: tradeType === "INTERNATIONAL",
                fromState: originStateDoc ? (originStateDoc as any).name : null,
                fromDistrict: originDistrictDoc ? (originDistrictDoc as any).name : null,
                packagingSpecifications: null,
            };

            const executionInquirySeed = [
                { type: "PROCUREMENT", ownerBy: plan.procurementBy, title: "Procurement Inquiry", details: baseDetails },
                ...(tradeType === "INTERNATIONAL" && isFromIndia
                    ? [{ type: "CERTIFICATION", ownerBy: plan.exportCustomsBy, title: "Export Customs Clearance Inquiry", details: baseDetails }]
                    : []),
                { type: "TRANSPORTATION", ownerBy: plan.transportBy, title: "Transportation Inquiry", details: baseDetails },
                ...(tradeType === "INTERNATIONAL"
                    ? [{ type: "SHIPPING", ownerBy: plan.shippingBy, title: "Freight Forwarding & Shipping Inquiry", details: { ...baseDetails, requiresShipping: true } }]
                    : []),
                {
                    type: "PACKAGING",
                    ownerBy: plan.packagingBy,
                    title: "Packaging Inquiry",
                    details: {
                        ...baseDetails,
                        packagingSpecifications,
                    },
                },
                { type: "QUALITY_TESTING", ownerBy: plan.qualityTestingBy, title: "Quality Testing & Assurance Inquiry", details: baseDetails },
            ];

            const candidateSets = await Promise.all(
                executionInquirySeed.map((x: any) => this.getCapabilityMatchedProviderIds(x.type))
            );

            const executionInquiries = executionInquirySeed.map((x: any, index: number) => ({
                ...x,
                status: "OPEN" as const,
                candidateProviders: candidateSets[index] || [],
                bids: [],
                committedProvider: null,
                createdAt: new Date()
            }));

            (inquiry as any).responsibilitiesFinalizedAt = new Date();
            (inquiry as any).responsibilityPlan = plan;
            (inquiry as any).executionContext = mergedContext;
            (inquiry as any).packagingSpecifications = packagingSpecifications;
            (inquiry as any).executionInquiries = executionInquiries;
            await inquiry.save();

            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.UPDATED,
                req.user!.id,
                {
                    metadata: {
                        action: "RESPONSIBILITIES_FINALIZED",
                        executionInquiryCount: executionInquiries.length
                    }
                }
            );

            try {
                const recipients = await notificationService.buildInquiryRecipients(inquiry as any);
                notificationService.removeActor(recipients, req.user?.id || null);

                const candidateCompanyIds = Array.from(
                    new Set(
                        executionInquiries
                            .flatMap((task: any) => task.candidateProviders || [])
                            .map((id: any) => String(id || ""))
                            .filter(Boolean)
                    )
                );
                if (candidateCompanyIds.length) {
                    const companies = await AssociateCompanyModel.find({ _id: { $in: candidateCompanyIds } })
                        .select("supervisor assignedOperator")
                        .lean();
                    companies.forEach((row: any) => {
                        if (row.supervisor) {
                            notificationService.addRecipient(recipients, row.supervisor, "Associate");
                        }
                        if (row.assignedOperator) {
                            notificationService.addRecipient(recipients, row.assignedOperator, "Operator");
                        }
                    });
                }

                await notificationService.createNotifications({
                    recipientMap: recipients,
                    createdByUserId: req.user?.id || null,
                    type: NotificationTypes.EXECUTION_TASKS_CREATED,
                    title: "New execution tasks",
                    message: "Execution tasks have been generated for this inquiry.",
                    entityType: NotificationEntityTypes.INQUIRY,
                    entityId: inquiry._id,
                    route: "/dashboard/execution-enquiries",
                    payload: { inquiryId: inquiry._id },
                    priority: "high",
                });
            } catch {
                // non-blocking
            }

            return res.json({
                success: true,
                data: inquiry,
                message: "Responsibilities finalized and execution inquiries generated"
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Update one execution inquiry item (bid / commit / status)
     * PATCH /api/v1/web/inquiries/:id/execution-inquiries/:type
     */
    async updateExecutionInquiry(req: Request, res: Response, next: NextFunction) {
        try {
            const { id, type } = req.params;
            const { bidAmount, commitNote, status, committedProvider } = req.body;

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "Invalid inquiry ID" });
            }

            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({ success: false, message: "Inquiry not found" });
            }

            const context: InquiryAccessContext = this.buildAccessContext(req);

            if (!canAccessInquiry(inquiry as any, context)) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            const isAdmin = req.user!.role === UserRole.ADMIN;
            const isOperatorUser = req.user!.role === UserRole.OPERATOR || req.user!.role === "team";
            let associateRole: "buyer" | "seller" | "mediator" | null = null;
            if (req.user!.role === UserRole.ASSOCIATE && context.associateId) {
                associateRole = getAssociateRole(inquiry as any, context.associateId);
            }

            const normalizedType = String(type || "").toUpperCase();
            const tasks = ((inquiry as any).executionInquiries || []) as any[];
            const idx = tasks.findIndex((t) => String(t?.type || "").toUpperCase() === normalizedType);
            if (idx < 0) {
                return res.status(404).json({ success: false, message: "Execution inquiry item not found" });
            }

            const task = tasks[idx];
            const ownerBy = String(task.ownerBy || "").toLowerCase();
            const associateCompanyId = String(context.associateCompanyId || "");
            const candidateProviders = Array.isArray(task?.candidateProviders) ? task.candidateProviders : [];
            const isProviderCandidate = Boolean(
                associateCompanyId &&
                candidateProviders.some((provider: any) => String(provider?._id || provider || "") === associateCompanyId)
            );
            const assignedOperatorId = inquiry.assignedOperatorId?.toString() || "";
            const isAssignedOperator = Boolean(isOperatorUser && assignedOperatorId && assignedOperatorId === req.user!.id);
            const canBid =
                isProviderCandidate ||
                (ownerBy === "buyer" && associateRole === "buyer") ||
                (ownerBy === "seller" && associateRole === "seller");
            const canCommit = isAdmin || isAssignedOperator;
            const canUpdateStatus = isAdmin;
            const canAct = canBid || canCommit || canUpdateStatus;

            if (!canAct) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to update this execution inquiry"
                });
            }

            if ((canBid || canCommit) && typeof bidAmount === "number" && !Number.isNaN(bidAmount)) {
                task.bidAmount = bidAmount;
            }
            if ((canBid || canCommit) && typeof commitNote === "string") {
                task.commitNote = commitNote;
            }
            if (isProviderCandidate && (typeof bidAmount === "number" || typeof commitNote === "string")) {
                const bidRows = Array.isArray(task.bids) ? task.bids : [];
                const existingBidIndex = bidRows.findIndex(
                    (bid: any) => String(bid?.company?._id || bid?.company || "") === associateCompanyId
                );
                const now = new Date();
                const bidPayload = {
                    company: associateCompanyId,
                    amount: typeof bidAmount === "number" && !Number.isNaN(bidAmount) ? bidAmount : null,
                    note: typeof commitNote === "string" ? commitNote : "",
                    status: "SUBMITTED",
                    createdBy: context.associateId || null,
                    createdAt: now,
                    updatedAt: now,
                };
                if (existingBidIndex >= 0) {
                    bidRows[existingBidIndex] = {
                        ...bidRows[existingBidIndex],
                        ...bidPayload,
                        createdAt: bidRows[existingBidIndex]?.createdAt || now,
                    };
                } else {
                    bidRows.push(bidPayload);
                }
                task.bids = bidRows;
            }
            if (canUpdateStatus && status && ["OPEN", "IN_PROGRESS", "COMPLETED"].includes(String(status).toUpperCase())) {
                const nextStatus = String(status).toUpperCase();
                task.status = nextStatus;
            }

            if (committedProvider) {
                if (!canCommit) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not authorized to commit this execution inquiry"
                    });
                }
                const committedProviderId = String(committedProvider || "");
                if (!Types.ObjectId.isValid(committedProviderId)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid committedProvider id"
                    });
                }

                const isCommittedCandidate = candidateProviders.some(
                    (provider: any) => String(provider?._id || provider || "") === committedProviderId
                );
                if (!isCommittedCandidate) {
                    return res.status(400).json({
                        success: false,
                        message: "Committed provider is not in candidate providers"
                    });
                }

                task.committedProvider = committedProviderId;
                const bidRows = Array.isArray(task.bids) ? task.bids : [];
                task.bids = bidRows.map((bid: any) => {
                    const bidCompanyId = String(bid?.company?._id || bid?.company || "");
                    return {
                        ...bid,
                        status: bidCompanyId === committedProviderId ? "AWARDED" : (bid?.status || "SUBMITTED"),
                        updatedAt: new Date(),
                    };
                });

                if (!(typeof task.bidAmount === "number" && !Number.isNaN(task.bidAmount))) {
                    const winningBid = task.bids.find(
                        (bid: any) => String(bid?.company?._id || bid?.company || "") === committedProviderId
                    );
                    const winningAmount = Number(winningBid?.amount);
                    if (!Number.isNaN(winningAmount)) {
                        task.bidAmount = winningAmount;
                    }
                }

                task.status = "COMPLETED";
                task.committedAt = new Date();
            }
            if (task.status === "COMPLETED") {
                task.committedAt = new Date();
            }

            tasks[idx] = task;
            (inquiry as any).executionInquiries = tasks;
            await inquiry.save();

            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.UPDATED,
                req.user!.id,
                {
                    metadata: {
                        action: "EXECUTION_INQUIRY_UPDATED",
                        type: normalizedType,
                        status: task.status
                    }
                }
            );

            return res.json({
                success: true,
                data: inquiry,
                message: "Execution inquiry updated"
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Get inquiry by ID with access control
     * GET /api/v1/web/inquiries/:id
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inquiry ID"
                });
            }

            // Fetch inquiry
            const inquiry = await InquiryModel.findById(id)
                .populate([
                    { path: "productId", select: "name description" },
                    {
                        path: "variantRateId",
                        select: "productVariant rate commission",
                        populate: {
                            path: "productVariant",
                            select: "name product",
                            populate: { path: "product", select: "name" }
                        }
                    },
                    {
                        path: "catalogItemId",
                        select: "productVariantId baseRateId finalPrice margin",
                        populate: [
                            {
                                path: "productVariantId",
                                select: "name product",
                                populate: { path: "product", select: "name" }
                            },
                            {
                                path: "baseRateId",
                                select: "rate commission"
                            }
                        ]
                    },
                    {
                        path: "buyerAssociateId",
                        select: "name email phone associateCompany",
                        populate: { path: "associateCompany", select: "name" }
                    },
                    {
                        path: "sellerAssociateId",
                        select: "name email phone associateCompany",
                        populate: { path: "associateCompany", select: "name" }
                    },
                    {
                        path: "mediatorAssociateId",
                        select: "name email phone associateCompany",
                        populate: { path: "associateCompany", select: "name" }
                    },
                    { path: "assignedOperatorId", select: "name email" },
                    { path: "executionInquiries.candidateProviders", select: "name email phone serviceCapabilities" },
                    { path: "executionInquiries.committedProvider", select: "name email phone serviceCapabilities" },
                    { path: "executionInquiries.bids.company", select: "name email phone serviceCapabilities" }
                ])
                .select("+notes"); // Include notes for access control filtering

            if (!inquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Inquiry not found"
                });
            }

            // Build access context
            const context: InquiryAccessContext = this.buildAccessContext(req);

            // Check access
            if (!canAccessInquiry(inquiry, context)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Filter fields based on role
            const filteredInquiry = filterInquiryFields(inquiry.toObject(), context);

            res.json({
                success: true,
                data: filteredInquiry
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * List inquiries with role-based filtering
     * GET /api/v1/web/inquiries
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { status, page = 1, limit = 20 } = req.query;

            // Build access context
            const context: InquiryAccessContext = this.buildAccessContext(req);

            // Build access filter
            const accessFilter = buildInquiryAccessFilter(context);

            // Additional filters
            const filters: any = { ...accessFilter };
            if (status && isValidInquiryStatus(status as string)) {
                filters.status = status;
            }

            // Query with pagination
            const skip = (Number(page) - 1) * Number(limit);
            const [inquiries, total] = await Promise.all([
                InquiryModel.find(filters)
                    .populate([
                        { path: "productId", select: "name description" },
                        {
                            path: "variantRateId",
                            select: "productVariant rate commission",
                            populate: {
                                path: "productVariant",
                                select: "name product",
                                populate: { path: "product", select: "name" }
                            }
                        },
                        {
                            path: "catalogItemId",
                            select: "productVariantId baseRateId finalPrice margin",
                            populate: [
                                {
                                    path: "productVariantId",
                                    select: "name product",
                                    populate: { path: "product", select: "name" }
                                },
                                {
                                    path: "baseRateId",
                                    select: "rate commission"
                                }
                            ]
                        },
                        {
                            path: "buyerAssociateId",
                            select: "name email phone associateCompany",
                            populate: { path: "associateCompany", select: "name" }
                        },
                        {
                            path: "sellerAssociateId",
                            select: "name email phone associateCompany",
                            populate: { path: "associateCompany", select: "name" }
                        },
                        {
                            path: "mediatorAssociateId",
                            select: "name email phone associateCompany",
                            populate: { path: "associateCompany", select: "name" }
                        },
                        { path: "assignedOperatorId", select: "name email" },
                        { path: "executionInquiries.candidateProviders", select: "name email phone serviceCapabilities" },
                        { path: "executionInquiries.committedProvider", select: "name email phone serviceCapabilities" },
                        { path: "executionInquiries.bids.company", select: "name email phone serviceCapabilities" }
                    ])
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                InquiryModel.countDocuments(filters)
            ]);

            // Filter fields for each inquiry
            const filteredInquiries = inquiries.map(inquiry =>
                filterInquiryFields(inquiry.toObject(), context)
            );

            res.json({
                success: true,
                data: filteredInquiries,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Update inquiry status with state machine validation
     * PATCH /api/v1/web/inquiries/:id/status
     */
    async updateStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inquiry ID"
                });
            }

            if (!status || !isValidInquiryStatus(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status value"
                });
            }

            // Fetch inquiry
            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Inquiry not found"
                });
            }

            // Validate transition
            if (!validateInquiryTransition(inquiry.status as InquiryStatus, status as InquiryStatus)) {
                throw new InvalidTransitionError(inquiry.status as InquiryStatus, status as InquiryStatus);
            }

            // Store previous status for event log
            const previousStatus = inquiry.status;

            // Update status
            inquiry.status = status as InquiryStatus;
            await inquiry.save();

            // Log status change event
            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.STATUS_CHANGE,
                req.user!.id,
                {
                    previousValue: previousStatus,
                    newValue: status
                }
            );

            await this.notifyInquiryParticipants({
                inquiry,
                actorId: req.user!.id,
                type: NotificationTypes.INQUIRY_STATUS_CHANGED,
                title: "Inquiry status updated",
                message: `Inquiry moved from ${previousStatus} to ${status}.`,
                payload: { previousStatus, status },
            });

            res.json({
                success: true,
                data: inquiry,
                message: `Status updated to ${status}`
            });
        } catch (error: any) {
            if (error instanceof InvalidTransitionError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * Update inquiry workflow stage (additive workflow, no status mutation)
     * PATCH /api/v1/web/inquiries/:id/workflow-stage
     */
    async updateWorkflowStage(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const workflowStage = String(req.body?.workflowStage || "").trim().toUpperCase();

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "Invalid inquiry ID" });
            }

            await ensureDefaultEnquiryRules();
            const stageRule = await EnquiryRuleModel.findOne({
                stageKey: workflowStage,
                isDeleted: { $ne: true },
                isActive: true,
            }).lean();
            if (!stageRule) {
                return res.status(400).json({ success: false, message: "Invalid or inactive workflow stage" });
            }

            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({ success: false, message: "Inquiry not found" });
            }

            const requiredActions = Array.isArray((stageRule as any)?.requiredActions)
                ? (stageRule as any).requiredActions
                : [];
            const missingActions: string[] = [];
            if (requiredActions.includes("SUPPLIER_ACCEPTED") && !(inquiry as any).sellerAcceptedAt) {
                missingActions.push("SUPPLIER_ACCEPTED");
            }
            if (requiredActions.includes("BUYER_CONFIRMED") && !(inquiry as any).buyerConfirmedAt) {
                missingActions.push("BUYER_CONFIRMED");
            }
            if (requiredActions.includes("RESPONSIBILITIES_FINALIZED") && !(inquiry as any).responsibilitiesFinalizedAt) {
                missingActions.push("RESPONSIBILITIES_FINALIZED");
            }
            if (missingActions.length) {
                return res.status(400).json({
                    success: false,
                    message: `Required actions missing: ${missingActions.join(", ")}`,
                });
            }

            const tradeType = String((inquiry as any)?.executionContext?.tradeType || "DOMESTIC").toUpperCase();
            const requiredRules = await DocumentRuleModel.find({
                isDeleted: { $ne: true },
                isActive: true,
                stageType: "INQUIRY",
                stageKey: workflowStage,
                isRequired: true,
                tradeType: { $in: [tradeType, "BOTH"] },
            }).lean();

            if (requiredRules.length > 0) {
                const requiredTypes: string[] = Array.from(
                    new Set(requiredRules.map((r: any) => String(r.docType || "")))
                ).filter(Boolean);
                const missingDocs: string[] = [];
                for (const type of requiredTypes) {
                    const count = await TradeDocumentModel.countDocuments({
                        enquiryId: inquiry._id,
                        type,
                        isDeleted: { $ne: true },
                    });
                    if (count <= 0) missingDocs.push(String(type));
                }
                if (missingDocs.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Required documents missing for ${workflowStage}: ${missingDocs.join(", ")}.`,
                    });
                }
            }

            // Auto-create order when workflow reaches a stage that triggers it
            if ((stageRule as any).triggersOrderCreation) {
                if (!inquiry.sellerAcceptedAt || !inquiry.buyerConfirmedAt) {
                    return res.status(400).json({
                        success: false,
                        message: "Supplier acceptance and buyer confirmation are required before order confirmation"
                    });
                }
                if (!(inquiry as any).responsibilitiesFinalizedAt) {
                    return res.status(400).json({
                        success: false,
                        message: "Responsibilities must be finalized before order confirmation"
                    });
                }
                const responsibilityPlan: any = (inquiry as any).responsibilityPlan || {};
                const requiredKeys = [
                    "procurementBy",
                    "certificateBy",
                    "transportBy",
                    "shippingBy",
                    "packagingBy",
                    "qualityTestingBy"
                ];
                const allowedOwners = new Set(["buyer", "seller", "obaol"]);
                const isPlanComplete = requiredKeys.every((k) => allowedOwners.has(String(responsibilityPlan?.[k] || "")));
                if (!isPlanComplete) {
                    return res.status(400).json({
                        success: false,
                        message: "Responsibilities must be finalized before order confirmation"
                    });
                }

                if (!(inquiry as any).order) {
                    const createdOrder = await OrderModel.create({
                        enquiry: inquiry._id,
                        responsibilities: responsibilityPlan,
                    });
                    await InventoryReservationModel.updateMany(
                        { enquiryId: inquiry._id, status: "RESERVED", isDeleted: { $ne: true } },
                        { $set: { orderId: createdOrder._id } }
                    );
                    await TradeDocumentModel.updateMany(
                        { enquiryId: inquiry._id, isDeleted: { $ne: true } },
                        { $set: { orderId: createdOrder._id } }
                    );
                    (inquiry as any).order = createdOrder._id;
                }
            }

            (inquiry as any).workflowStage = workflowStage;
            await inquiry.save();

            return res.json({ success: true, data: inquiry, message: "Workflow stage updated" });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Assign operator to inquiry (admin only)
     * PATCH /api/v1/web/inquiries/:id/assign
     */
    async assignOperator(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { operatorId } = req.body;

            // Admin-only check
            if (req.user!.role !== UserRole.ADMIN) {
                return res.status(403).json({
                    success: false,
                    message: "Only admins can assign operators"
                });
            }

            if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(operatorId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ID"
                });
            }

            // Fetch inquiry
            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Inquiry not found"
                });
            }

            // Store previous assignment
            const previousOperator = inquiry.assignedOperatorId?.toString() || null;

            // Update assignment
            inquiry.assignedOperatorId = new Types.ObjectId(operatorId);
            await inquiry.save();

            // Log assignment event
            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.ASSIGNED,
                req.user!.id,
                {
                    previousValue: previousOperator,
                    newValue: operatorId
                }
            );

            await inquiry.populate("assignedOperatorId", "name email");

            await this.notifyInquiryParticipants({
                inquiry,
                actorId: req.user!.id,
                type: NotificationTypes.INQUIRY_ASSIGNED,
                title: "Inquiry assignment updated",
                message: "A responsible operator has been assigned for this inquiry.",
                payload: { previousOperator, operatorId },
                priority: "high",
            });

            res.json({
                success: true,
                data: inquiry,
                message: "Operator assigned successfully"
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Get inquiry event history (admin/assigned operator only)
     * GET /api/v1/web/inquiries/:id/events
     */
    async getEvents(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inquiry ID"
                });
            }

            // Fetch inquiry to check access
            const inquiry = await InquiryModel.findById(id);
            if (!inquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Inquiry not found"
                });
            }

            // Only admin or assigned operator can view events
            const isAdmin = req.user!.role === UserRole.ADMIN;
            const isAssignedOperator =
                (req.user!.role === UserRole.OPERATOR || req.user!.role === "team") &&
                inquiry.assignedOperatorId?.toString() === req.user!.id;

            if (!isAdmin && !isAssignedOperator) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Fetch events
            const events = await InquiryEventModel.find({ inquiryId: id })
                .sort({ createdAt: -1 })
                .populate("performedBy", "name email role");

            res.json({
                success: true,
                data: events
            });
        } catch (error: any) {
            next(error);
        }
    }
}
