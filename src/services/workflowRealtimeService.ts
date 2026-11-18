import { randomUUID } from "crypto";
import { notificationService } from "./notificationService";
import { notificationStreamService } from "./notificationStreamService";
import { InquiryModel } from "../database/models/enquiry";

export type WorkflowEntityType = "INQUIRY" | "ORDER" | "DOCUMENT";

type PublishParams = {
  entityType: WorkflowEntityType;
  entity: any;
  actorId?: string | null;
  changedResources?: string[];
};

class WorkflowRealtimeService {
  async publish({ entityType, entity, actorId, changedResources = [] }: PublishParams) {
    if (!entity?._id) return;
    const recipients = entityType === "INQUIRY"
      ? await notificationService.buildInquiryRelatedRecipients(entity)
      : entityType === "ORDER"
        ? await notificationService.buildOrderRecipients(entity)
        : entity?.orderId
          ? await notificationService.buildOrderRecipients(entity.orderId)
          : entity?.enquiryId
            ? await notificationService.buildInquiryRelatedRecipients(await InquiryModel.findById(entity.enquiryId).lean())
            : new Map();

    // Keep the actor subscribed as well so their other tabs stay synchronized.
    if (actorId && !recipients.has(String(actorId))) recipients.set(String(actorId), "Associate" as any);
    const data = {
      eventId: randomUUID(),
      eventType: `${entityType.toLowerCase()}.updated`,
      entityType,
      entityId: String(entity._id),
      parentEntityIds: {
        enquiryId: String(entity.enquiryId?._id || entity.enquiryId || entity.enquiry?._id || entity.enquiry || "") || undefined,
        orderId: String(entity.orderId?._id || entity.orderId || "") || undefined,
      },
      version: Number(entity.__v || 0),
      changedResources,
      occurredAt: new Date().toISOString(),
      actorId: actorId || undefined,
    };
    await Promise.all(Array.from(recipients.keys()).map((userId) =>
      notificationStreamService.publishToUser(userId, "workflow-update", data)
    ));
  }
}

export const workflowRealtimeService = new WorkflowRealtimeService();
