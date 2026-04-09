import { Request, Response } from "express";
import mongoose from "mongoose";
import { notificationService } from "../services/notificationService";
import { NotificationModel } from "../database/models/notification";
import { NotificationEntityTypes, NotificationTypes } from "../constants/notificationTypes";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyFunctionMappingModel } from "../database/models/companyFunctionMapping";

export class NotificationController {
  private sectionPrefixes: Record<string, string> = {
    notifications: "/dashboard/notifications",
    approvals: "/dashboard/approvals",
    enquiries: "/dashboard/enquiries",
    orders: "/dashboard/orders",
    execution: "/dashboard/execution-enquiries",
  };

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

      const result = await notificationService.listForUser(userId, {
        page,
        limit,
        unreadOnly,
        ...(type ? { type } : {}),
      });

      return res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to load notifications." });
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
        .select("route")
        .lean();

      const summary = {
        notifications: 0,
        approvals: 0,
        enquiries: 0,
        orders: 0,
        execution: 0,
      };

      unreadRows.forEach((row: any) => {
        const route = String(row?.route || "");
        if (route.startsWith(this.sectionPrefixes.approvals)) summary.approvals += 1;
        else if (route.startsWith(this.sectionPrefixes.enquiries)) summary.enquiries += 1;
        else if (route.startsWith(this.sectionPrefixes.orders)) summary.orders += 1;
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

      if (section !== "notifications") {
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

      const recipientMap = new Map<string, "Admin" | "Associate" | "Operator">();

      if (normalizedRoles.includes("Admin")) {
        const admins = await AdminModel.find({ isDeleted: { $ne: true }, isActive: { $ne: false } })
          .select("_id")
          .lean();
        admins.forEach((row: any) => notificationService.addRecipient(recipientMap, row._id, "Admin"));
      }

      if (normalizedRoles.includes("Associate")) {
        const associateQuery: any = { isDeleted: { $ne: true }, isActive: { $ne: false } };
        if (hasCompanyFilter) {
          associateQuery.associateCompany = { $in: companyIds.map((id) => new mongoose.Types.ObjectId(id)) };
        }
        const associates = await AssociateModel.find(associateQuery).select("_id").lean();
        associates.forEach((row: any) => notificationService.addRecipient(recipientMap, row._id, "Associate"));
      }

      if (normalizedRoles.includes("Operator")) {
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
          roles: normalizedRoles,
          companyFunctionIds: functionIds,
        },
      });

      return res.json({ success: true, data: { created: result.length } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to broadcast notification." });
    }
  }
}

export const notificationController = new NotificationController();
