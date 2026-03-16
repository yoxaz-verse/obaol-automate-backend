import { Request, Response } from "express";
import mongoose from "mongoose";
import { notificationService } from "../services/notificationService";
import { NotificationModel } from "../database/models/notification";

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
}

export const notificationController = new NotificationController();
