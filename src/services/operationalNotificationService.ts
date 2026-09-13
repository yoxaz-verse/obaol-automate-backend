import mongoose from "mongoose";
import { notificationService } from "./notificationService";
import { sendOperationalNotificationEmail } from "../utils/mailer";

type RecipientRole = "Admin" | "Operator" | "Associate";

type DispatchParams = {
  recipientMap: Map<string, RecipientRole>;
  actorId?: string | null;
  type: string;
  title: string;
  message: string;
  entityType: "INQUIRY" | "ORDER" | "INVENTORY" | "VARIANT_RATE" | "APPROVAL" | "SYSTEM";
  entityId: any;
  route: string;
  payload?: Record<string, any>;
  priority?: "low" | "medium" | "high";
  moduleLabel: string;
  reference?: string;
};

class OperationalNotificationService {
  private normalizeId(value: any): string | null {
    const v = String(value?._id || value || "").trim();
    return mongoose.Types.ObjectId.isValid(v) ? v : null;
  }

  async dispatch(params: DispatchParams) {
    const recipientMap = new Map(params.recipientMap);
    notificationService.removeActor(recipientMap, params.actorId || null);
    if (!recipientMap.size) return { notificationCount: 0, emailCount: 0, warnings: [] as string[] };

    const warnings: string[] = [];
    let notificationCount = 0;
    try {
      const created = await notificationService.createNotifications({
        recipientMap,
        createdByUserId: params.actorId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: this.normalizeId(params.entityId) || params.entityId,
        route: params.route,
        payload: params.payload || {},
        priority: params.priority || "medium",
      });
      notificationCount = created.length;
    } catch (error: any) {
      warnings.push(`Failed to create ${params.type} dashboard notification: ${error?.message || "unknown error"}`);
    }

    const emailRows = await notificationService.getRecipientEmails(recipientMap);
    const seenEmails = new Set<string>();
    let emailCount = 0;
    for (const row of emailRows) {
      const email = String(row.email || "").trim().toLowerCase();
      if (!email || seenEmails.has(email)) continue;
      seenEmails.add(email);
      try {
        await sendOperationalNotificationEmail({
          toEmail: email,
          title: params.title,
          moduleLabel: params.moduleLabel,
          summary: params.message,
          route: params.route,
          reference: params.reference,
        });
        emailCount += 1;
      } catch (error: any) {
        warnings.push(`Failed to send ${params.type} email to ${email}: ${error?.message || "unknown error"}`);
      }
    }

    warnings.forEach((warning) => console.warn(`[operational-notification] ${warning}`));
    return { notificationCount, emailCount, warnings };
  }
}

export const operationalNotificationService = new OperationalNotificationService();
