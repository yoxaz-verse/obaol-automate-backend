import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { NotificationCategoryModel } from "../database/models/notificationCategory";

const role = (req: Request) => String(req.user?.role || "");
const isAdmin = (req: Request) => role(req).toLowerCase() === "admin";

const duplicateResponse = (res: Response) => res.status(409).json({
  success: false,
  message: "A notification category with this name already exists.",
  errors: { name: "Category names must be unique." },
});

export class NotificationCategoryController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const includeArchived = isAdmin(req) && String(req.query.includeArchived || "").toLowerCase() === "true";
      const rows = await NotificationCategoryModel.find(includeArchived ? {} : { isActive: true })
        .sort({ isActive: -1, name: 1 })
        .lean();
      return res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      if (!name) return res.status(400).json({ success: false, message: "Category name is required.", errors: { name: "Category name is required." } });
      if (name.length > 80) return res.status(400).json({ success: false, message: "Category name must be 80 characters or fewer.", errors: { name: "Use 80 characters or fewer." } });
      if (description.length > 240) return res.status(400).json({ success: false, message: "Category description must be 240 characters or fewer.", errors: { description: "Use 240 characters or fewer." } });
      const existing = await NotificationCategoryModel.findOne({ normalizedName: name.toLowerCase() }).lean();
      if (existing) return duplicateResponse(res);
      const created = await NotificationCategoryModel.create({
        name,
        description,
        createdByUserId: req.user!.id,
        createdByRole: role(req),
      });
      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return duplicateResponse(res);
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid category id." });
      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      if (!name) return res.status(400).json({ success: false, message: "Category name is required.", errors: { name: "Category name is required." } });
      if (name.length > 80 || description.length > 240) return res.status(400).json({ success: false, message: "Category details are too long." });
      const duplicate = await NotificationCategoryModel.findOne({ normalizedName: name.toLowerCase(), _id: { $ne: req.params.id } }).lean();
      if (duplicate) return duplicateResponse(res);
      const restore = req.body?.isActive === true;
      const updated = await NotificationCategoryModel.findByIdAndUpdate(req.params.id, { $set: {
        name,
        normalizedName: name.toLowerCase(),
        description,
        ...(restore ? { isActive: true, archivedAt: null } : {}),
      } }, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ success: false, message: "Notification category not found." });
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return duplicateResponse(res);
      next(error);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid category id." });
      const updated = await NotificationCategoryModel.findByIdAndUpdate(req.params.id, { $set: { isActive: false, archivedAt: new Date() } }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "Notification category not found." });
      return res.json({ success: true, data: updated });
    } catch (error) { next(error); }
  }
}

export const notificationCategoryController = new NotificationCategoryController();
