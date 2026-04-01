import mongoose from "mongoose";
import { AdminModel } from "../database/models/admin";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { NotificationModel } from "../database/models/notification";

type RecipientRole = "Admin" | "Operator" | "Associate";

type CreateNotificationParams = {
  recipientMap: Map<string, RecipientRole>;
  createdByUserId?: string | null;
  type: string;
  title: string;
  message: string;
  entityType: "INQUIRY" | "ORDER" | "VARIANT_RATE" | "APPROVAL";
  entityId: any;
  route: string;
  payload?: Record<string, any>;
  priority?: "low" | "medium" | "high";
};

class NotificationService {
  private normalizeId(value: any): string | null {
    const v = (value?._id || value || "").toString().trim();
    return mongoose.Types.ObjectId.isValid(v) ? v : null;
  }

  addRecipient(map: Map<string, RecipientRole>, id: any, role: RecipientRole) {
    const normalized = this.normalizeId(id);
    if (!normalized) return;
    if (!map.has(normalized)) map.set(normalized, role);
  }

  removeActor(map: Map<string, RecipientRole>, actorId?: string | null) {
    const normalized = this.normalizeId(actorId);
    if (!normalized) return;
    map.delete(normalized);
  }

  async addAdmins(map: Map<string, RecipientRole>) {
    const admins = await AdminModel.find({
      isDeleted: { $ne: true },
      isActive: { $ne: false },
    })
      .select("_id")
      .lean();
    admins.forEach((row: any) => this.addRecipient(map, row._id, "Admin"));
  }

  async buildInquiryRecipients(inquiry: any) {
    const map = new Map<string, RecipientRole>();
    this.addRecipient(map, inquiry?.buyerAssociateId, "Associate");
    this.addRecipient(map, inquiry?.sellerAssociateId, "Associate");
    this.addRecipient(map, inquiry?.mediatorAssociateId, "Associate");
    this.addRecipient(map, inquiry?.supplierOperatorId, "Operator");
    this.addRecipient(map, inquiry?.dealCloserOperatorId, "Operator");
    await this.addAdmins(map);
    return map;
  }

  async buildVariantRateLiveRecipients(variantRate: any) {
    const map = new Map<string, RecipientRole>();
    this.addRecipient(map, variantRate?.associate, "Associate");
    await this.addAdmins(map);

    const companyId = this.normalizeId(variantRate?.associateCompany);
    if (companyId) {
      const company = await AssociateCompanyModel.findById(companyId).select("assignedOperator").lean();
      this.addRecipient(map, (company as any)?.assignedOperator, "Operator");
    }
    return map;
  }

  async createNotifications(params: CreateNotificationParams) {
    const docs = Array.from(params.recipientMap.entries()).map(([recipientUserId, recipientRole]) => ({
      recipientUserId: new mongoose.Types.ObjectId(recipientUserId),
      recipientRole,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
      route: params.route,
      payload: params.payload || {},
      priority: params.priority || "medium",
      ...(this.normalizeId(params.createdByUserId) ? { createdByUserId: new mongoose.Types.ObjectId(String(params.createdByUserId)) } : {}),
    }));
    if (!docs.length) return [];
    return NotificationModel.insertMany(docs);
  }

  async listForUser(userId: string, options: { page: number; limit: number; unreadOnly?: boolean; type?: string }) {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
    const query: any = { recipientUserId: new mongoose.Types.ObjectId(userId) };
    if (options.unreadOnly) query.isRead = false;
    if (options.type) query.type = String(options.type).trim();

    const [total, rows] = await Promise.all([
      NotificationModel.countDocuments(query),
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return {
      data: rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async unreadCount(userId: string) {
    const count = await NotificationModel.countDocuments({
      recipientUserId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });
    return count;
  }

  async markRead(userId: string, id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return NotificationModel.findOneAndUpdate(
      { _id: id, recipientUserId: new mongoose.Types.ObjectId(userId) },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();
  }

  async markAllRead(userId: string) {
    return NotificationModel.updateMany(
      { recipientUserId: new mongoose.Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }
}

export const notificationService = new NotificationService();
