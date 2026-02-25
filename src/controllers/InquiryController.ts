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

/**
 * Inquiry Controller
 * Implements business logic with state machine and access control
 */
export class InquiryController {
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
                buyerAssociateId,
                sellerAssociateId,
                mediatorAssociateId,
                assignedEmployeeId,
                variantRateId,
                catalogItemId,
                preferredIncoterm,
                supplierCommitUntil,
                notes
            } = req.body;
            let { rate, adminCommission, mediatorCommission } = req.body;

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
                buyerAssociateId,
                sellerAssociateId,
                mediatorAssociateId,
                assignedEmployeeId,
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
                { path: "buyerAssociateId", select: "name email phone" },
                { path: "sellerAssociateId", select: "name email phone" },
                { path: "mediatorAssociateId", select: "name email phone" },
                { path: "assignedEmployeeId", select: "name email" }
            ]);

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

            const context: InquiryAccessContext = {
                userId: req.user!.id,
                userRole: req.user!.role,
                associateId: (req.user as any).associateId || (req.user!.role === UserRole.ASSOCIATE ? req.user!.id : null)
            };

            if (!canAccessInquiry(inquiry as any, context)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Only seller associate, admin, or assigned employee can commit
            const isAdmin = req.user!.role === UserRole.ADMIN;
            const isAssignedEmployee =
                (req.user!.role === UserRole.EMPLOYEE || req.user!.role === "team") &&
                inquiry.assignedEmployeeId?.toString() === req.user!.id;

            let isSeller = false;
            if (req.user!.role === UserRole.ASSOCIATE && context.associateId) {
                const role = getAssociateRole(inquiry as any, context.associateId);
                isSeller = role === "seller";
            }

            if (!isAdmin && !isAssignedEmployee && !isSeller) {
                return res.status(403).json({
                    success: false,
                    message: "Only the supplier, assigned employee, or admin can commit this inquiry"
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

            const context: InquiryAccessContext = {
                userId: req.user!.id,
                userRole: req.user!.role,
                associateId: (req.user as any).associateId || (req.user!.role === UserRole.ASSOCIATE ? req.user!.id : null)
            };

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

            inquiry.sellerAcceptedAt = new Date();
            await inquiry.save();

            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.UPDATED,
                req.user!.id,
                {
                    metadata: { action: "SELLER_ACCEPTED" }
                }
            );

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

            const context: InquiryAccessContext = {
                userId: req.user!.id,
                userRole: req.user!.role,
                associateId: (req.user as any).associateId || (req.user!.role === UserRole.ASSOCIATE ? req.user!.id : null)
            };

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
                    { path: "buyerAssociateId", select: "name email phone" },
                    { path: "sellerAssociateId", select: "name email phone" },
                    { path: "mediatorAssociateId", select: "name email phone" },
                    { path: "assignedEmployeeId", select: "name email" }
                ])
                .select("+notes"); // Include notes for access control filtering

            if (!inquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Inquiry not found"
                });
            }

            // Build access context
            const context: InquiryAccessContext = {
                userId: req.user!.id,
                userRole: req.user!.role,
                associateId: (req.user as any).associateId || (req.user!.role === UserRole.ASSOCIATE ? req.user!.id : null)
            };

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
            const context: InquiryAccessContext = {
                userId: req.user!.id,
                userRole: req.user!.role,
                associateId: (req.user as any).associateId || (req.user!.role === UserRole.ASSOCIATE ? req.user!.id : null)
            };

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
                        { path: "buyerAssociateId", select: "name email phone" },
                        { path: "sellerAssociateId", select: "name email phone" },
                        { path: "mediatorAssociateId", select: "name email phone" },
                        { path: "assignedEmployeeId", select: "name email" }
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
     * Assign employee to inquiry (admin only)
     * PATCH /api/v1/web/inquiries/:id/assign
     */
    async assignEmployee(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { employeeId } = req.body;

            // Admin-only check
            if (req.user!.role !== UserRole.ADMIN) {
                return res.status(403).json({
                    success: false,
                    message: "Only admins can assign employees"
                });
            }

            if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(employeeId)) {
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
            const previousEmployee = inquiry.assignedEmployeeId?.toString() || null;

            // Update assignment
            inquiry.assignedEmployeeId = new Types.ObjectId(employeeId);
            await inquiry.save();

            // Log assignment event
            await createInquiryEvent(
                inquiry._id,
                InquiryEventType.ASSIGNED,
                req.user!.id,
                {
                    previousValue: previousEmployee,
                    newValue: employeeId
                }
            );

            await inquiry.populate("assignedEmployeeId", "name email");

            res.json({
                success: true,
                data: inquiry,
                message: "Employee assigned successfully"
            });
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Get inquiry event history (admin/assigned employee only)
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

            // Only admin or assigned employee can view events
            const isAdmin = req.user!.role === UserRole.ADMIN;
            const isAssignedEmployee =
                (req.user!.role === UserRole.EMPLOYEE || req.user!.role === "team") &&
                inquiry.assignedEmployeeId?.toString() === req.user!.id;

            if (!isAdmin && !isAssignedEmployee) {
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
