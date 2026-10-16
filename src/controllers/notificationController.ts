import { Request, Response } from "express";
import mongoose from "mongoose";
import { notificationService } from "../services/notificationService";
import { NotificationModel } from "../database/models/notification";
import { NotificationEntityTypes, NotificationTypes } from "../constants/notificationTypes";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyFunctionMappingModel } from "../database/models/companyFunctionMapping";
import { OperatorModel } from "../database/models/operator";
import { CustomerSupportAgentModel } from "../database/models/customerSupportAgent";
import { SupportConversationModel } from "../database/models/supportConversation";
import { NotificationCategoryModel } from "../database/models/notificationCategory";
import { notificationStreamService } from "../services/notificationStreamService";
type BroadcastRecipientRole = "Admin" | "Operator" | "Associate" | "CustomerSupport";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase().replace(/[_-]/g, "");
const canonicalRecipientRole = (value: unknown): BroadcastRecipientRole | null => {
  switch (normalizeRole(value)) {
    case "admin": return "Admin";
    case "associate": case "customer": return "Associate";
    case "operator": return "Operator";
    case "team": return "Operator";
    case "customersupport": return "CustomerSupport";
    default: return null;
  }
};

const participantModel = (role: BroadcastRecipientRole) => {
  if (role === "Admin") return AdminModel;
  if (role === "Associate") return AssociateModel;
  if (role === "Operator") return OperatorModel;
  if (role === "CustomerSupport") return CustomerSupportAgentModel;
  return null;
};

export class NotificationController {
  private sectionPrefixes: Record<string, string> = {
    notifications: "/dashboard/notifications",
    approvals: "/dashboard/approvals",
    enquiries: "/dashboard/enquiries",
    orders: "/dashboard/orders",
    inventory: "/dashboard/inventory",
    execution: "/dashboard/execution-enquiries",
    bidding: "/dashboard/execution-enquiries",
    support: "/dashboard/customer-support",
  };

  async stream(req: Request, res: Response) {
    const userId = String(req.user?.id || "");
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const unsubscribe = notificationStreamService.subscribe(userId, res);
    req.on("close", unsubscribe);
  }

  async list(req: Request, res: Response) {
    try {
      const userId = String(req.user?.id || "");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
      }

      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const unreadOnly = String(req.query.unreadOnly || "").toLowerCase() === "true";
      const type = String(req.query.type || "").trim();
      const categoryId = String(req.query.categoryId || "").trim();
      if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) return res.status(400).json({ success: false, message: "Invalid notification category." });

      const result = await notificationService.listForUser(userId, {
        page,
        limit,
        unreadOnly,
        ...(type ? { type } : {}),
        ...(categoryId ? { categoryId } : {}),
      });

      return res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to load notifications." });
    }
  }

  async supportParticipants(req: Request, res: Response) {
    try {
      const search = String(req.query.search || "").trim().toLowerCase();
      const limit = Math.min(50, Math.max(1, Number(req.query.limit || 25)));
      const conversations = await SupportConversationModel.aggregate([
        { $sort: { lastMessageAt: -1 } },
        { $group: { _id: { requesterId: "$requesterId", requesterRole: "$requesterRole" }, lastConversationAt: { $first: "$lastMessageAt" } } },
        { $sort: { lastConversationAt: -1 } },
        { $limit: search ? 250 : limit },
      ]);
      const rows = (await Promise.all(conversations.map(async (entry: any) => {
        const recipientRole = canonicalRecipientRole(entry._id.requesterRole);
        const model = recipientRole ? participantModel(recipientRole) : null;
        if (!recipientRole || !model) return null;
        const profile: any = await (model as any).findOne({ _id: entry._id.requesterId, isDeleted: { $ne: true }, isActive: { $ne: false } }).select("name email").lean();
        if (!profile) return null;
        const haystack = `${profile.name || ""} ${profile.email || ""} ${recipientRole}`.toLowerCase();
        if (search && !haystack.includes(search)) return null;
        return { id: String(profile._id), name: profile.name || "User", email: profile.email || "", role: recipientRole, lastConversationAt: entry.lastConversationAt };
      }))).filter(Boolean).slice(0, limit);
      return res.json({ success: true, data: rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to load support participants." });
    }
  }

  async unreadCount(req: Request, res: Response) {
    try {
      const userId = String(req.user?.id || "");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
      }
      const count = await notificationService.unreadCount(userId);
      return res.json({ success: true, data: { unreadCount: count } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to fetch unread count." });
    }
  }

  async unreadSummary(req: Request, res: Response) {
    try {
      const userId = String(req.user?.id || "");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
      }

      const unreadRows = await NotificationModel.find({
        recipientUserId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      })
        .select("route type")
        .lean();

      const summary = {
        notifications: 0,
        approvals: 0,
        enquiries: 0,
        orders: 0,
        inventory: 0,
        execution: 0,
        bidding: 0,
        support: 0,
      };

      unreadRows.forEach((row: any) => {
        const route = String(row?.route || "");
        const type = String(row?.type || "");
        if (route.startsWith(this.sectionPrefixes.support)) summary.support += 1;
        else if (route.startsWith(this.sectionPrefixes.approvals)) summary.approvals += 1;
        else if (route.startsWith(this.sectionPrefixes.enquiries)) summary.enquiries += 1;
        else if (route.startsWith(this.sectionPrefixes.orders)) summary.orders += 1;
        else if (route.startsWith(this.sectionPrefixes.inventory)) summary.inventory += 1;
        else if (route.startsWith(this.sectionPrefixes.execution) && type.startsWith("BID_")) summary.bidding += 1;
        else if (route.startsWith(this.sectionPrefixes.execution)) summary.execution += 1;
        else summary.notifications += 1;
      });

      return res.json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to fetch unread summary." });
    }
  }

  async markSectionRead(req: Request, res: Response) {
    try {
      const userId = String(req.user?.id || "");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
      }

      const section = String(req.query.section || "").trim();
      if (!section || !this.sectionPrefixes[section]) {
        return res.status(400).json({ success: false, message: "Invalid section." });
      }

      const query: any = {
        recipientUserId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      };

      if (section === "bidding") {
        query.type = { $regex: "^BID_" };
        query.route = { $regex: `^${this.sectionPrefixes.bidding}` };
      } else if (section !== "notifications") {
        const prefix = this.sectionPrefixes[section];
        query.route = { $regex: `^${prefix}` };
      }

      const result = await NotificationModel.updateMany(query, {
        $set: { isRead: true, readAt: new Date() },
      });

      return res.json({
        success: true,
        data: { modifiedCount: (result as any).modifiedCount || 0 },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to mark section as read." });
    }
  }

  async markRead(req: Request, res: Response) {
    try {
      const userId = String(req.user?.id || "");
      const id = String(req.params.id || "");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
      }
      const updated = await notificationService.markRead(userId, id);
      if (!updated) return res.status(404).json({ success: false, message: "Notification not found." });
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to mark notification as read." });
    }
  }

  async markAllRead(req: Request, res: Response) {
    try {
      const userId = String(req.user?.id || "");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
      }
      const result = await notificationService.markAllRead(userId);
      return res.json({
        success: true,
        data: { modifiedCount: (result as any).modifiedCount || 0 },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to mark all notifications as read." });
    }
  }

  async broadcast(req: Request, res: Response) {
    try {
      const userId = String(req.user?.id || "");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
      }

      const title = String(req.body?.title || "").trim();
      const message = String(req.body?.message || "").trim();
      const priorityRaw = String(req.body?.priority || "medium").toLowerCase();
      const rolesRaw = Array.isArray(req.body?.roles) ? req.body.roles : [];
      const functionIdsRaw = Array.isArray(req.body?.companyFunctionIds) ? req.body.companyFunctionIds : [];
      const recipientIdsRaw = Array.isArray(req.body?.recipientUserIds) ? req.body.recipientUserIds : [];
      const categoryId = String(req.body?.categoryId || "").trim();
      const actorRole = canonicalRecipientRole(req.user?.role);

      if (!title || !message) {
        return res.status(400).json({ success: false, message: "Title and message are required." });
      }

      const allowedRoles = ["Admin", "Associate", "Operator"];
      const roles = Array.from(
        new Set(
          rolesRaw
            .map((r: any) => String(r || "").trim())
            .filter((r: string) => allowedRoles.includes(r))
        )
      );
      const normalizedRoles = roles.length ? roles : allowedRoles;

      const priority: "low" | "medium" | "high" =
        priorityRaw === "low" || priorityRaw === "high" ? (priorityRaw as any) : "medium";

      let category: any = null;
      if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) return res.status(400).json({ success: false, message: "Invalid notification category." });
        category = await NotificationCategoryModel.findOne({ _id: categoryId, isActive: true }).lean();
        if (!category) return res.status(400).json({ success: false, message: "The selected notification category is unavailable." });
      }

      const functionIds: string[] = Array.from(
        new Set(
          functionIdsRaw
            .map((id: any) => String(id || "").trim())
            .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        )
      );

      let companyIds: string[] = [];
      const hasCompanyFilter = functionIds.length > 0;
      if (hasCompanyFilter) {
        const functionObjectIds = functionIds.map((id: string) => new mongoose.Types.ObjectId(id));
        const mappings = await CompanyFunctionMappingModel.find({
          functionId: { $in: functionObjectIds },
        })
          .select("companyId")
          .lean();
        companyIds = Array.from(new Set(mappings.map((row: any) => String(row?.companyId || "")).filter(Boolean)));
      }

      const recipientMap = new Map<string, any>();

      if (actorRole === "CustomerSupport") {
        if (rolesRaw.length || functionIdsRaw.length) return res.status(403).json({ success: false, message: "Customer support may notify only selected support participants." });
        const requestedIds: string[] = Array.from(new Set<string>(recipientIdsRaw.map((id: any) => String(id || "").trim()).filter((id: string) => mongoose.Types.ObjectId.isValid(id))));
        if (!requestedIds.length) return res.status(400).json({ success: false, message: "Select at least one support participant." });
        const eligible = await SupportConversationModel.aggregate([
          { $match: { requesterId: { $in: requestedIds.map((id: string) => new mongoose.Types.ObjectId(id)) } } },
          { $group: { _id: { requesterId: "$requesterId", requesterRole: "$requesterRole" } } },
        ]);
        eligible.forEach((entry: any) => {
          const eligibleRole = canonicalRecipientRole(entry._id.requesterRole);
          if (eligibleRole) recipientMap.set(String(entry._id.requesterId), eligibleRole);
        });
        if (recipientMap.size !== requestedIds.length) return res.status(403).json({ success: false, message: "One or more selected users are not eligible support participants." });
      }

      if (actorRole === "Admin" && normalizedRoles.includes("Admin")) {
        const admins = await AdminModel.find({ isDeleted: { $ne: true }, isActive: { $ne: false } })
          .select("_id")
          .lean();
        admins.forEach((row: any) => notificationService.addRecipient(recipientMap, row._id, "Admin"));
      }

      if (actorRole === "Admin" && normalizedRoles.includes("Associate")) {
        const associateQuery: any = { isDeleted: { $ne: true }, isActive: { $ne: false } };
        if (hasCompanyFilter) {
          associateQuery.associateCompany = { $in: companyIds.map((id) => new mongoose.Types.ObjectId(id)) };
        }
        const associates = await AssociateModel.find(associateQuery).select("_id").lean();
        associates.forEach((row: any) => notificationService.addRecipient(recipientMap, row._id, "Associate"));
      }

      if (actorRole === "Admin" && normalizedRoles.includes("Operator")) {
        const companyQuery: any = { assignedOperator: { $ne: null } };
        if (hasCompanyFilter) {
          companyQuery._id = { $in: companyIds.map((id) => new mongoose.Types.ObjectId(id)) };
        }
        const companies = await AssociateCompanyModel.find(companyQuery).select("assignedOperator").lean();
        companies.forEach((row: any) => notificationService.addRecipient(recipientMap, row.assignedOperator, "Operator"));
      }

      if (recipientMap.size === 0) {
        return res.status(400).json({ success: false, message: "No recipients matched the selected filters." });
      }

      const result = await notificationService.createNotifications({
        recipientMap,
        createdByUserId: userId,
        type: NotificationTypes.GENERAL_MESSAGE,
        title,
        message,
        entityType: NotificationEntityTypes.SYSTEM,
        entityId: new mongoose.Types.ObjectId(userId),
        route: "/dashboard/notifications",
        priority,
        payload: {
          ...(actorRole === "Admin" ? { roles: normalizedRoles, companyFunctionIds: functionIds } : { recipientUserIds: Array.from(recipientMap.keys()) }),
        },
        categoryId: category?._id || null,
        categoryName: category?.name || "",
      });

      return res.json({ success: true, data: { created: result.length } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to broadcast notification." });
    }
  }
}

export const notificationController = new NotificationController();
