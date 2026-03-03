import { Request, Response } from "express";
import mongoose from "mongoose";
import { notificationService } from "../services/notificationService";

export class NotificationController {
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

