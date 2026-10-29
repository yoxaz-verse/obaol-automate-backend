import { Request, Response } from "express";
import { Types } from "mongoose";
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
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { ensureDefaultDocumentRules } from "../utils/documentRules";
import { ensureDefaultFlowRules } from "../utils/flowRules";
import { buildPaymentPlanFromTermId, applyPaymentPlanStageUpdate } from "../utils/paymentPlan";
import { AssociateReferralService } from "../services/associateReferral.service";
import { detectOffPlatformDisclosure } from "../utils/offPlatformDisclosure";
import { prepareExternalOrder } from "../services/orders/externalOrder.service";

export class OrderController {
    private engine: CrudEngine;

    constructor() {
        this.engine = new CrudEngine(OrderModel, "orders");
    }

    private async disclosureCompanyNames(companyId: any): Promise<string[]> {
        if (!companyId || !Types.ObjectId.isValid(String(companyId))) return [];
        const company: any = await AssociateCompanyModel.findById(companyId)
            .select("name registeredTradeName gstVerification.legalName gstVerification.tradeName")
            .lean();
        return [company?.name, company?.registeredTradeName, company?.gstVerification?.legalName, company?.gstVerification?.tradeName]
            .map((value) => String(value || "").trim())
            .filter(Boolean);
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
            let disclosureCompanyId = (req.user as any)?.associateCompany || null;
            if (!disclosureCompanyId && (enquiry as any).buyerAssociateId) {
                const buyer: any = await AssociateModel.findById((enquiry as any).buyerAssociateId).select("associateCompany").lean();
                disclosureCompanyId = buyer?.associateCompany || null;
            }
            const createNoteViolation = detectOffPlatformDisclosure(req.body?.notes, {
                companyNames: await this.disclosureCompanyNames(disclosureCompanyId),
            });
            if (createNoteViolation) {
                return res.status(400).json({ success: false, message: createNoteViolation.message });
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
            if (!req.body.executionContext && (enquiry as any).executionContext) {
                req.body.executionContext = (enquiry as any).executionContext;
            }
            if (!req.body.supplierOperatorId) {
                let autoSupplierOperatorId: any = (enquiry as any).supplierOperatorId || null;
                if (!autoSupplierOperatorId) {
                    try {
                        const sellerAssociate = await AssociateModel.findById(enquiry.sellerAssociateId).select("associateCompany").lean();
                        const sellerCompanyId = sellerAssociate?.associateCompany || null;
                        if (sellerCompanyId) {
                            const sellerCompany = await AssociateCompanyModel.findById(sellerCompanyId).select("assignedOperator").lean();
                            autoSupplierOperatorId = sellerCompany?.assignedOperator || null;
                        }
                    } catch (error) {
                        autoSupplierOperatorId = null;
                    }
                }
                if (autoSupplierOperatorId) req.body.supplierOperatorId = autoSupplierOperatorId;
            }
            if (!req.body.dealCloserOperatorId && (enquiry as any).dealCloserOperatorId) {
                req.body.dealCloserOperatorId = (enquiry as any).dealCloserOperatorId;
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
            if (!req.body.milestones.deliveryTargetDate) {
                const expectedArrival = (enquiry as any)?.expectedArrivalDate
                    ? new Date((enquiry as any).expectedArrivalDate)
                    : null;
                let revisionDelivery: Date | null = null;
                const rounds = Array.isArray((enquiry as any).revisionRounds) ? (enquiry as any).revisionRounds : [];
                if (rounds.length > 0) {
                    const sorted = [...rounds].sort((a: any, b: any) => {
                        const aTime = new Date(a?.buyerRequestedAt || a?.closedAt || 0).getTime();
                        const bTime = new Date(b?.buyerRequestedAt || b?.closedAt || 0).getTime();
                        return bTime - aTime;
                    });
                    const found = sorted.find((round: any) =>
                        Array.isArray(round?.items) &&
                        round.items.some((item: any) => String(item?.key || "").toUpperCase() === "DELIVERY_TIMELINE" && item?.buyerDeliveryDate)
                    );
                    if (found) {
                        const item = found.items.find((i: any) => String(i?.key || "").toUpperCase() === "DELIVERY_TIMELINE" && i?.buyerDeliveryDate);
                        if (item?.buyerDeliveryDate) revisionDelivery = new Date(item.buyerDeliveryDate);
                    }
                } else if ((enquiry as any)?.revisionThread?.items) {
                    const item = (enquiry as any).revisionThread.items.find((i: any) => String(i?.key || "").toUpperCase() === "DELIVERY_TIMELINE" && i?.buyerDeliveryDate);
                    if (item?.buyerDeliveryDate) revisionDelivery = new Date(item.buyerDeliveryDate);
                }

                const targetDate = revisionDelivery || expectedArrival || null;
                if (targetDate && !Number.isNaN(targetDate.getTime())) {
                    req.body.milestones.deliveryTargetDate = targetDate;
                }
            }

            if (!req.body.paymentTermId && (enquiry as any).paymentTermId) {
                req.body.paymentTermId = (enquiry as any).paymentTermId;
            }
            if (!req.body.incotermId && (enquiry as any).preferredIncoterm) {
                req.body.incotermId = (enquiry as any).preferredIncoterm;
            }
            if (!req.body.paymentPlan) {
                const termId = req.body.paymentTermId ? new Types.ObjectId(String(req.body.paymentTermId)) : null;
                const paymentPlan = await buildPaymentPlanFromTermId(termId, tradeType);
                if (paymentPlan) req.body.paymentPlan = paymentPlan;
            }
            req.body.participantCompanyIds = await AssociateReferralService.getParticipantCompanyIds(enquiry);

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

            const prepared = prepareExternalOrder(req.body, req.user?.id);
            if (!prepared.ok) return res.status(400).json({ success: false, message: prepared.message });

            await ensureDefaultFlowRules();
            const firstStage = await FlowRuleModel.findOne({
                flowType: "TRADE_ORDER",
                isDeleted: { $ne: true },
                isActive: true,
                tradeType: { $in: [prepared.payload.externalTradeType, "BOTH"] },
            }).sort({ sortOrder: 1 }).lean();

            const payload = prepared.payload;
            payload.workflowStage = String(firstStage?.stageKey || "ORDER_CREATED");

            if (prepared.paymentTermId) {
                const termId = new Types.ObjectId(String(prepared.paymentTermId));
                const paymentPlan = await buildPaymentPlanFromTermId(termId, prepared.tradeType);
                if (paymentPlan) payload.paymentPlan = paymentPlan;
            }

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
            const sourceId = (result as any)?.sourceTradeDocumentId;
            const sourceQuotation: any = sourceId
                ? await TradeDocumentModel.findById(sourceId).select("_id documentNumber status decidedAt totals").lean()
                : null;
            const data = (result as any)?.toObject ? (result as any).toObject() : { ...(result as any) };
            data.sourceQuotation = sourceQuotation ? {
                id: sourceQuotation._id,
                documentNumber: sourceQuotation.documentNumber,
                status: sourceQuotation.status,
                decidedAt: sourceQuotation.decidedAt,
                totals: sourceQuotation.totals,
                route: `/dashboard/documentation/${sourceQuotation._id}`,
            } : null;
            res.json({ success: true, data });
        } catch (error: any) {
            logError(error, req, "OrderController.getById");
            res.status(500).json({ success: false, message: error.message });
        }
    }

    public update = async (req: Request, res: Response) => {
        try {
            if (typeof req.body?.notes !== "undefined") {
                const noteViolation = detectOffPlatformDisclosure(req.body.notes, {
                    companyNames: await this.disclosureCompanyNames((req.user as any)?.associateCompany),
                });
                if (noteViolation) return res.status(400).json({ success: false, message: noteViolation.message });
            }
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
                const executionTasks = Array.isArray((order as any)?.enquiry?.executionInquiries)
                    ? (order as any).enquiry.executionInquiries
                    : [];
                const requiredSubflowTypes = new Set<string>();
                executionTasks.forEach((task: any) => {
                    const type = String(task?.type || "").toUpperCase();
                    if (!type) return;
                    if (type === "PROCUREMENT") requiredSubflowTypes.add("PROCUREMENT");
                    if (type === "PACKAGING") requiredSubflowTypes.add("PACKAGING");
                    if (type === "QUALITY_TESTING") requiredSubflowTypes.add("QUALITY_QA");
                    if (type === "CERTIFICATION") requiredSubflowTypes.add("CERTIFICATION");
                    if (type === "WAREHOUSE") requiredSubflowTypes.add("WAREHOUSE");
                    if (type === "SHIPPING") requiredSubflowTypes.add("FREIGHT_FORWARDING");
                    if (type === "TRANSPORTATION") requiredSubflowTypes.add("INLAND_TRANSPORTATION");
                });
                const scopedConfigs = requiredSubflowTypes.size
                    ? subflowConfigs.filter((config: any) => requiredSubflowTypes.has(String(config.subflowType || "").toUpperCase()))
                    : [];
                if (scopedConfigs.length > 0) {
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
                    for (const config of scopedConfigs) {
                        const configType = String(config.subflowType || "").toUpperCase();
                        const stages = await getSubflowStages(configType);
                        if (!stages.length) continue;
                        const lastStage = stages[stages.length - 1];
                        if (configType === "INLAND_TRANSPORTATION") {
                            const instances = Array.isArray((order as any)?.subflowInstances)
                                ? (order as any).subflowInstances.filter((inst: any) => String(inst?.type || "").toUpperCase() === "INLAND_TRANSPORTATION")
                                : [];
                            if (instances.length > 0) {
                                const allComplete = instances.every((inst: any) => {
                                    const instanceKey = String(inst?.instanceKey || "");
                                    if (!instanceKey) return false;
                                    const stageKey = String((order as any)?.subflowStages?.[`INLAND_TRANSPORTATION::${instanceKey}`] || "").toUpperCase();
                                    return stageKey && stageKey === String(lastStage.stageKey);
                                });
                                if (allComplete) completedSubflows.add(configType);
                            } else {
                                const currentStage = String(
                                    (order as any)?.subflowStages?.[configType] ||
                                    (order as any)?.subflowStages?.INLAND_LOGISTICS ||
                                    (order as any)?.subflowStages?.LOGISTICS ||
                                    ""
                                ).toUpperCase();
                                if (currentStage && currentStage === String(lastStage.stageKey)) {
                                    completedSubflows.add(configType);
                                }
                            }
                        } else {
                            const currentStage = String((order as any)?.subflowStages?.[configType] || "").toUpperCase();
                            if (currentStage && currentStage === String(lastStage.stageKey)) {
                                completedSubflows.add(configType);
                            }
                        }
                    }

                    const missingSubflows: string[] = [];
                    for (const config of scopedConfigs) {
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
            if (workflowStage) {
                await applyPaymentPlanStageUpdate(result._id, workflowStage);
            }
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
