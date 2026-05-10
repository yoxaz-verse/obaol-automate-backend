import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { DocumentTypeModel } from "../database/models/documentType";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";

export class DocumentTypeController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await DocumentTypeModel.find({ isDeleted: { $ne: true }, isActive: true }).sort({ category: 1, label: 1 }).lean();
      return res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(normalizeRole(req.user?.role))) return res.status(403).json({ success: false, message: "Admin only." });
      const slug = String(req.body?.slug || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const label = String(req.body?.label || "").trim();
      if (!slug || !label) return res.status(400).json({ success: false, message: "slug and label are required." });
      const exists = await DocumentTypeModel.findOne({ slug, isDeleted: { $ne: true } }).lean();
      if (exists) return res.status(409).json({ success: false, message: "Document type already exists." });
      const created = await DocumentTypeModel.create({
        slug,
        label,
        category: String(req.body?.category || "GENERAL").toUpperCase(),
        icon: String(req.body?.icon || "").trim(),
        defaultPageSetup: req.body?.defaultPageSetup || undefined,
      });
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(normalizeRole(req.user?.role))) return res.status(403).json({ success: false, message: "Admin only." });
      const id = String(req.params.id || "");
      if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id." });
      const update: any = {};
      if (req.body?.label !== undefined) update.label = String(req.body.label || "").trim();
      if (req.body?.category !== undefined) update.category = String(req.body.category || "GENERAL").toUpperCase();
      if (req.body?.icon !== undefined) update.icon = String(req.body.icon || "").trim();
      if (req.body?.defaultPageSetup !== undefined) update.defaultPageSetup = req.body.defaultPageSetup;
      if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);
      const row = await DocumentTypeModel.findByIdAndUpdate(id, update, { new: true });
      if (!row) return res.status(404).json({ success: false, message: "Document type not found." });
      return res.json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(normalizeRole(req.user?.role))) return res.status(403).json({ success: false, message: "Admin only." });
      const id = String(req.params.id || "");
      if (!Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id." });
      const row = await DocumentTypeModel.findByIdAndUpdate(id, { isDeleted: true, isActive: false }, { new: true });
      if (!row) return res.status(404).json({ success: false, message: "Document type not found." });
      return res.json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  }
}
