import type { NextFunction, Request, Response } from "express";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { workflowRealtimeService, type WorkflowEntityType } from "../services/workflowRealtimeService";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const targetFor = (req: Request): { entityType: WorkflowEntityType; id: string; resources: string[] } | null => {
  const path = String(req.originalUrl || req.url).split("?")[0];
  const inquiry = path.match(/\/inquiries\/([a-f\d]{24})(?:\/|$)/i);
  if (inquiry) return { entityType: "INQUIRY", id: inquiry[1], resources: ["enquiry", "enquiry-list", "documents", "dashboard"] };
  const order = path.match(/\/orders\/([a-f\d]{24})(?:\/|$)/i);
  if (order) return { entityType: "ORDER", id: order[1], resources: ["order", "order-list", "documents", "dashboard"] };
  const document = path.match(/\/trade-documents\/([a-f\d]{24})(?:\/|$)/i);
  if (document) return { entityType: "DOCUMENT", id: document[1], resources: ["documents", "enquiry", "order"] };
  return null;
};

export const workflowRealtime = (req: Request, res: Response, next: NextFunction) => {
  if (!mutationMethods.has(req.method)) return next();
  const target = targetFor(req);
  if (!target) return next();
  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    void (async () => {
      const entity = target.entityType === "INQUIRY"
        ? await InquiryModel.findById(target.id).lean()
        : target.entityType === "ORDER"
          ? await OrderModel.findById(target.id).lean()
          : await TradeDocumentModel.findById(target.id).lean();
      if (entity) await workflowRealtimeService.publish({
        entityType: target.entityType,
        entity,
        actorId: String(req.user?.id || "") || null,
        changedResources: target.resources,
      });
    })().catch((error) => console.error("[realtime] Failed to publish workflow update:", error?.message || error));
  });
  next();
};
