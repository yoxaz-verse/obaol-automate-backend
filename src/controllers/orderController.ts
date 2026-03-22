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
import { FlowRuleModel } from "../database/models/flowRule";
import { OrderSubflowConfigModel } from "../database/models/orderSubflowConfig";
import { ensureDefaultDocumentRules } from "../utils/documentRules";
import { ensureDefaultFlowRules } from "../utils/flowRules";

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
            const tradeType = String(enquiry.executionContext?.tradeType || "DOMESTIC").toUpperCase();

            const domesticRequiredKeys = [
                "procurementBy",
                "qualityTestingBy",
                "packagingBy",
                "transportBy"
            ];
            const internationalRequiredKeys = [
                "shippingBy",
                "certificateBy"
            ];

            const requiredKeys = tradeType === "INTERNATIONAL"
                ? [...domesticRequiredKeys, ...internationalRequiredKeys]
                : domesticRequiredKeys;

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

    public createExternal = async (req: Request, res: Response) => {
        try {
            const role = String(req.user?.role || "").toLowerCase();
            if (!(role === "admin" || role === "operator" || role === "team" || role === "associate")) {
                return res.status(403).json({ success: false, message: "Not allowed." });
            }

            const externalBuyer = req.body?.externalBuyer || {};
            const externalSeller = req.body?.externalSeller || {};
            const externalProduct = req.body?.externalProduct || {};
            const externalTradeType = String(req.body?.externalTradeType || "").toUpperCase();

            if (!externalBuyer?.name || !externalSeller?.name || !externalProduct?.name || !externalTradeType) {
                return res.status(400).json({
                    success: false,
                    message: "Buyer name, seller name, product name, and trade type are required."
                });
            }
            if (!["DOMESTIC", "INTERNATIONAL"].includes(externalTradeType)) {
                return res.status(400).json({ success: false, message: "Invalid trade type." });
            }

            await ensureDefaultFlowRules();
            const firstStage = await FlowRuleModel.findOne({
                flowType: "TRADE_ORDER",
                isDeleted: { $ne: true },
                isActive: true,
                tradeType: { $in: [externalTradeType, "BOTH"] },
            }).sort({ sortOrder: 1 }).lean();

            const payload = {
                enquiry: null,
                isExternal: true,
                externalCreatedBy: req.user?.id || null,
                externalTradeType,
                externalBuyer: {
                    name: String(externalBuyer.name || "").trim(),
                    email: String(externalBuyer.email || "").trim(),
                    phone: String(externalBuyer.phone || "").trim(),
                },
                externalSeller: {
                    name: String(externalSeller.name || "").trim(),
                    email: String(externalSeller.email || "").trim(),
                    phone: String(externalSeller.phone || "").trim(),
                },
                externalProduct: {
                    name: String(externalProduct.name || "").trim(),
                    variant: String(externalProduct.variant || "").trim(),
                    quantity: externalProduct.quantity ?? null,
                    unit: String(externalProduct.unit || "").trim(),
                },
                workflowStage: String(firstStage?.stageKey || "ORDER_CREATED"),
                status: "Procuring",
            };

            const order = await this.engine.create(req, payload);
            return res.status(201).json({ success: true, data: order });
        } catch (error: any) {
            logError(error, req, "OrderController.createExternal");
            return res.status(500).json({ success: false, message: error.message });
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
                await ensureDefaultFlowRules();
                const order = await OrderModel.findById(req.params.id).populate("enquiry").lean();
                if (!order) return res.status(404).json({ success: false, message: "Order not found" });

                const tradeType = String(
                    (order as any)?.externalTradeType ||
                    (order as any)?.enquiry?.executionContext?.tradeType ||
                    "DOMESTIC"
                ).toUpperCase();
                const orderId = order?._id;
                const stageRule = await FlowRuleModel.findOne({
                    flowType: "TRADE_ORDER",
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

                const subflowConfigs = await OrderSubflowConfigModel.find({
                    isDeleted: { $ne: true },
                    isActive: true,
                }).lean();
                if (subflowConfigs.length > 0) {
                    const orderStages = await FlowRuleModel.find({
                        flowType: "TRADE_ORDER",
                        isDeleted: { $ne: true },
                        isActive: true,
                        tradeType: { $in: [tradeType, "BOTH"] },
                    }).sort({ sortOrder: 1 }).lean();

                    const stageRank = new Map<string, number>();
                    orderStages.forEach((stage: any) => {
                        stageRank.set(String(stage.stageKey), Number(stage.sortOrder || 0));
                    });

                    const nextRank = stageRank.get(workflowStage) ?? 0;
                    const subflowRuleCache = new Map<string, any[]>();

                    const getSubflowStages = async (flowType: string) => {
                        if (subflowRuleCache.has(flowType)) return subflowRuleCache.get(flowType) as any[];
                        const stages = await FlowRuleModel.find({
                            flowType,
                            isDeleted: { $ne: true },
                            isActive: true,
                        }).sort({ sortOrder: 1 }).lean();
                        subflowRuleCache.set(flowType, stages);
                        return stages;
                    };

                    const completedSubflows = new Set<string>();
                    for (const config of subflowConfigs) {
                        const stages = await getSubflowStages(String(config.subflowType));
                        if (!stages.length) continue;
                        const lastStage = stages[stages.length - 1];
                        const currentStage = String((order as any)?.subflowStages?.[config.subflowType] || "").toUpperCase();
                        if (currentStage && currentStage === String(lastStage.stageKey)) {
                            completedSubflows.add(String(config.subflowType));
                        }
                    }

                    const missingSubflows: string[] = [];
                    for (const config of subflowConfigs) {
                        const gateStage = String(config.mustCompleteBeforeOrderStage || "").toUpperCase();
                        const gateRank = stageRank.get(gateStage) ?? 0;
                        if (nextRank >= gateRank) {
                            const type = String(config.subflowType);
                            if (!completedSubflows.has(type)) missingSubflows.push(type);
                            const deps = Array.isArray(config.dependsOnSubflows) ? config.dependsOnSubflows : [];
                            deps.forEach((dep: string) => {
                                if (!completedSubflows.has(String(dep))) missingSubflows.push(String(dep));
                            });
                        }
                    }

                    if (missingSubflows.length > 0) {
                        const unique = Array.from(new Set(missingSubflows));
                        return res.status(400).json({
                            success: false,
                            message: `Required subflows are incomplete for ${workflowStage}: ${unique.join(", ")}.`,
                            missingSubflows: unique,
                        });
                    }
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
