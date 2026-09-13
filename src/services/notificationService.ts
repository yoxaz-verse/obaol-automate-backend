import mongoose from "mongoose";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { InventoryModel } from "../database/models/inventory";
import { NotificationModel } from "../database/models/notification";
import { OperatorModel } from "../database/models/operator";
import { OrderModel } from "../database/models/order";

type RecipientRole = "Admin" | "Operator" | "Associate";

type CreateNotificationParams = {
  recipientMap: Map<string, RecipientRole>;
  createdByUserId?: string | null;
  type: string;
  title: string;
  message: string;
  entityType: "INQUIRY" | "ORDER" | "INVENTORY" | "VARIANT_RATE" | "APPROVAL" | "SYSTEM";
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
    await this.addInquiryRelatedRecipients(map, inquiry);
    await this.addAdmins(map);
    return map;
  }

  async buildInquiryRelatedRecipients(inquiry: any) {
    const map = new Map<string, RecipientRole>();
    await this.addInquiryRelatedRecipients(map, inquiry);
    return map;
  }

  private async addInquiryRelatedRecipients(map: Map<string, RecipientRole>, inquiry: any) {
    this.addRecipient(map, inquiry?.buyerAssociateId, "Associate");
    this.addRecipient(map, inquiry?.sellerAssociateId, "Associate");
    this.addRecipient(map, inquiry?.mediatorAssociateId, "Associate");
    this.addRecipient(map, inquiry?.supplierOperatorId, "Operator");
    this.addRecipient(map, inquiry?.dealCloserOperatorId, "Operator");
    this.addRecipient(map, inquiry?.handlerOperatorId, "Operator");
    this.addRecipient(map, inquiry?.pendingHandlerOperatorId, "Operator");
  }

  async buildInventoryRecipients(inventoryOrReservation: any) {
    const map = new Map<string, RecipientRole>();
    const inventory = inventoryOrReservation?.inventoryId?._id
      ? inventoryOrReservation.inventoryId
      : inventoryOrReservation?.inventoryId
      ? await InventoryModel.findById(inventoryOrReservation.inventoryId).select("associate associateCompany").lean()
        : inventoryOrReservation;

    this.addRecipient(map, inventory?.associate, "Associate");

    const companyId = this.normalizeId(inventoryOrReservation?.associateCompany || inventory?.associateCompany);
    if (companyId) {
      const company = await AssociateCompanyModel.findById(companyId).select("supervisor assignedOperator").lean();
      this.addRecipient(map, (company as any)?.supervisor, "Associate");
      this.addRecipient(map, (company as any)?.assignedOperator, "Operator");
    }
    return map;
  }

  async buildOrderRecipients(orderInput: any) {
    const map = new Map<string, RecipientRole>();
    const orderId = this.normalizeId(orderInput?._id || orderInput);
    const order = orderId
      ? await OrderModel.findById(orderId).populate("enquiry").lean()
      : orderInput;

    if (order?.enquiry) {
      await this.addInquiryRelatedRecipients(map, order.enquiry);
    }
    this.addRecipient(map, order?.supplierOperatorId, "Operator");
    this.addRecipient(map, order?.dealCloserOperatorId, "Operator");
    this.addRecipient(map, order?.procurementOperatorId, "Operator");
    this.addRecipient(map, order?.handlerOperatorId, "Operator");

    const companyId = this.normalizeId(order?.associateCompanyId);
    if (companyId) {
      const company = await AssociateCompanyModel.findById(companyId).select("supervisor assignedOperator").lean();
      this.addRecipient(map, (company as any)?.supervisor, "Associate");
      this.addRecipient(map, (company as any)?.assignedOperator, "Operator");
    }
    return map;
  }

  async buildExecutionBidRecipients(inquiry: any, task: any, bidCompanyId?: any, committedProviderId?: any) {
    const map = await this.buildInquiryRelatedRecipients(inquiry);
    const companyIds = Array.from(
      new Set(
        [bidCompanyId, committedProviderId, task?.committedProvider, ...(Array.isArray(task?.candidateProviders) ? task.candidateProviders : [])]
          .map((id: any) => this.normalizeId(id))
          .filter(Boolean) as string[]
      )
    );

    if (companyIds.length) {
      const companies = await AssociateCompanyModel.find({ _id: { $in: companyIds } })
        .select("supervisor assignedOperator")
        .lean();
      companies.forEach((company: any) => {
        this.addRecipient(map, company.supervisor, "Associate");
        this.addRecipient(map, company.assignedOperator, "Operator");
      });
    }
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

  async getRecipientEmails(recipientMap: Map<string, RecipientRole>) {
    const rows = Array.from(recipientMap.entries());
    const idsByRole = rows.reduce<Record<RecipientRole, string[]>>(
      (acc, [id, role]) => {
        acc[role].push(id);
        return acc;
      },
      { Admin: [], Associate: [], Operator: [] }
    );

    const [admins, associates, operators] = await Promise.all([
      idsByRole.Admin.length
        ? AdminModel.find({ _id: { $in: idsByRole.Admin } }).select("_id email").lean()
        : Promise.resolve([]),
      idsByRole.Associate.length
        ? AssociateModel.find({ _id: { $in: idsByRole.Associate } }).select("_id email").lean()
        : Promise.resolve([]),
      idsByRole.Operator.length
        ? OperatorModel.find({ _id: { $in: idsByRole.Operator } }).select("_id email").lean()
        : Promise.resolve([]),
    ]);

    const emailById = new Map<string, string>();
    [...admins, ...associates, ...operators].forEach((row: any) => {
      const email = String(row?.email || "").trim();
      if (email) emailById.set(String(row._id), email);
    });

    return rows
      .map(([id, role]) => ({ id, role, email: emailById.get(id) || "" }))
      .filter((row) => row.email);
  }

  async listForUser(
    userId: string,
    options: { page: number; limit: number; unreadOnly?: boolean; type?: string; recipientRole?: RecipientRole }
  ) {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
    const query: any = { recipientUserId: new mongoose.Types.ObjectId(userId) };
    if (options.recipientRole) query.recipientRole = options.recipientRole;
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

  async unreadCount(userId: string, recipientRole?: RecipientRole) {
    const count = await NotificationModel.countDocuments({
      recipientUserId: new mongoose.Types.ObjectId(userId),
      ...(recipientRole ? { recipientRole } : {}),
      isRead: false,
    });
    return count;
  }

  async markRead(userId: string, id: string, recipientRole?: RecipientRole) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return NotificationModel.findOneAndUpdate(
      { _id: id, recipientUserId: new mongoose.Types.ObjectId(userId), ...(recipientRole ? { recipientRole } : {}) },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();
  }

  async markAllRead(userId: string, recipientRole?: RecipientRole) {
    return NotificationModel.updateMany(
      { recipientUserId: new mongoose.Types.ObjectId(userId), ...(recipientRole ? { recipientRole } : {}), isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }
}

export const notificationService = new NotificationService();
