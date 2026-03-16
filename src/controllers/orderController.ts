import { Request, Response } from "express";
import { OrderModel } from "../database/models/order";
import { InquiryModel as EnquiryModel } from "../database/models/enquiry";
import { CrudEngine } from "../core/engine/crud.engine";
import { logError } from "../utils/errorLogger";
import { notificationService } from "../services/notificationService";
import { NotificationEntityTypes, NotificationTypes } from "../constants/notificationTypes";
import { InventoryReservationModel } from "../database/models/inventoryReservation";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { DocumentRuleModel } from "../database/models/documentRule";
import { OrderRuleModel } from "../database/models/orderRule";
import { ensureDefaultDocumentRules } from "../utils/documentRules";
import { ensureDefaultOrderRules } from "../utils/orderRules";

export class OrderController {
    private engine: CrudEngine;

    constructor() {
        this.engine = new CrudEngine(OrderModel, "orders");
    }

    public create = async (req: Request, res: Response) => {
        try {
            if (!req.body.enquiry) {
                return res.status(400).json({ success: false, message: "enquiry is required to create order" });
            }

            const enquiry = await EnquiryModel.findById(req.body.enquiry);
            if (!enquiry) {
                return res.status(404).json({ success: false, message: "Source inquiry not found" });
            }

            if (!enquiry.sellerAcceptedAt || !enquiry.buyerConfirmedAt) {
                return res.status(400).json({
                    success: false,
                    message: "Supplier acceptance and buyer confirmation are required before conversion"
                });
            }

            const responsibilityPlan: any = (enquiry as any).responsibilityPlan || {};
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
            if (!isPlanComplete || !(enquiry as any).responsibilitiesFinalizedAt) {
                return res.status(400).json({
                    success: false,
                    message: "Responsibilities must be finalized before conversion"
                });
            }

            // If frontend does not send responsibilities, inherit from finalized enquiry plan.
            if (!req.body.responsibilities) {
                req.body.responsibilities = responsibilityPlan;
            }
            // Initialize milestone dates on conversion (scheduling + procurement + source inspection).
            const now = new Date();
            req.body.milestones = req.body.milestones || {};
            if (!req.body.milestones.schedulingFinalizedDate) {
                req.body.milestones.schedulingFinalizedDate = now;
            }
            if (!req.body.milestones.procurementInspectionDate) {
                req.body.milestones.procurementInspectionDate = now;
            }
            if (!req.body.milestones.procurementDate) {
                req.body.milestones.procurementDate = now;
            }

            const order = await this.engine.create(req, req.body);

            if (req.body.enquiry) {
                await EnquiryModel.findByIdAndUpdate(req.body.enquiry, {
                    status: "Converted",
                    order: order._id
                });
            }

            if (req.body.enquiry) {
                await InventoryReservationModel.updateMany(
                    { enquiryId: req.body.enquiry, status: "RESERVED", isDeleted: { $ne: true } },
                    { $set: { orderId: order._id } }
                );
            }

            if (req.body.enquiry) {
                await TradeDocumentModel.updateMany(
                    { enquiryId: req.body.enquiry, isDeleted: { $ne: true } },
                    { $set: { orderId: order._id } }
                );
            }

            const recipients = await notificationService.buildInquiryRecipients(enquiry as any);
            notificationService.removeActor(recipients, req.user?.id || null);
            await notificationService.createNotifications({
                recipientMap: recipients,
                createdByUserId: req.user?.id || null,
                type: NotificationTypes.ORDER_CONVERTED,
                title: "Inquiry converted to order",
                message: "An inquiry has been converted and order execution has started.",
                entityType: NotificationEntityTypes.ORDER,
                entityId: order._id,
                route: `/dashboard/orders/${order._id}`,
                payload: { enquiryId: enquiry._id, orderId: order._id },
                priority: "high",
            });

            res.status(201).json({ success: true, data: order });
        } catch (error: any) {
            logError(error, req, "OrderController.create");
            res.status(500).json({ success: false, message: error.message });
        }
    };

    public getAll = async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const { page: p, limit: l, ...query } = req.query;
            const result = await this.engine.findAll(req, { page, limit }, query);
            res.json({ success: true, data: result });
        } catch (error: any) {
            logError(error, req, "OrderController.getAll");
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public getById = async (req: Request, res: Response) => {
        try {
            const result = await this.engine.findOne(req, { _id: req.params.id });
            if (!result) return res.status(404).json({ success: false, message: "Order not found" });
            res.json({ success: true, data: result });
        } catch (error: any) {
            logError(error, req, "OrderController.getById");
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public update = async (req: Request, res: Response) => {
        try {
            const workflowStage = String(req.body?.workflowStage || "").trim().toUpperCase();
            const milestonePatch = req.body?.milestones || {};
            const hasProcurementDates = milestonePatch.procurementDate || milestonePatch.procurementInspectionDate;
            if (hasProcurementDates) {
                const existing = await OrderModel.findById(req.params.id).select("milestones").lean();
                if (!existing) return res.status(404).json({ success: false, message: "Order not found" });

                const nextInspection = milestonePatch.procurementInspectionDate ?? (existing as any)?.milestones?.procurementInspectionDate ?? null;
                const nextProcurement = milestonePatch.procurementDate ?? (existing as any)?.milestones?.procurementDate ?? null;

                if (nextInspection && nextProcurement) {
                    const inspectionDate = new Date(nextInspection);
                    const procurementDate = new Date(nextProcurement);
                    if (inspectionDate.getTime() > procurementDate.getTime()) {
                        return res.status(400).json({
                            success: false,
                            message: "Source inspection date cannot be after procurement date. It can be the same day or earlier."
                        });
                    }
                }
            }
            if (workflowStage) {
                await ensureDefaultDocumentRules();
                await ensureDefaultOrderRules();
                const order = await OrderModel.findById(req.params.id).populate("enquiry").lean();
                if (!order) return res.status(404).json({ success: false, message: "Order not found" });

                const tradeType = String((order as any)?.enquiry?.executionContext?.tradeType || "DOMESTIC").toUpperCase();
                const orderId = order?._id;
                const stageRule = await OrderRuleModel.findOne({
                    stageKey: workflowStage,
                    isDeleted: { $ne: true },
                    isActive: true,
                    tradeType: { $in: [tradeType, "BOTH"] },
                }).lean();
                if (!stageRule) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid or inactive workflow stage for this trade type"
                    });
                }

                const rules = await DocumentRuleModel.find({
                    isDeleted: { $ne: true },
                    isActive: true,
                    stageType: "ORDER",
                    stageKey: workflowStage,
                    isRequired: true,
                    tradeType: { $in: [tradeType, "BOTH"] },
                }).lean();

                if (rules.length > 0) {
                    const requiredTypes: string[] = Array.from(
                        new Set(rules.map((r: any) => String(r.docType || "")))
                    ).filter(Boolean);
                    const missing: string[] = [];
                    for (const type of requiredTypes) {
                        const count = await TradeDocumentModel.countDocuments({
                            orderId,
                            type,
                            isDeleted: { $ne: true }
                        });
                        if (count <= 0) missing.push(String(type));
                    }
                    if (missing.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: `Required documents missing for ${workflowStage}: ${missing.join(", ")}.`
                        });
                    }
                }
            }
            const result = await this.engine.update(req, req.params.id, req.body);
            if (!result) return res.status(404).json({ success: false, message: "Order not found" });
            res.json({ success: true, data: result });
        } catch (error: any) {
            logError(error, req, "OrderController.update");
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public delete = async (req: Request, res: Response) => {
        try {
            const result = await this.engine.delete(req, req.params.id);
            if (!result) return res.status(404).json({ success: false, message: "Order not found" });
            res.json({ success: true, data: result });
        } catch (error: any) {
            logError(error, req, "OrderController.delete");
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
