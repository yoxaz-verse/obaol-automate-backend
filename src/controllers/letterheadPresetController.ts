import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { LetterheadPresetModel } from "../database/models/letterheadPreset";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";

export class LetterheadPresetController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = String(req.query?.companyId || "").trim();
      const query: any = { isDeleted: { $ne: true }, isActive: true };
      if (companyId && Types.ObjectId.isValid(companyId)) {
        query.$or = [{ scope: "GLOBAL" }, { scope: "COMPANY_OVERRIDE", companyId: new Types.ObjectId(companyId) }];
      }
      const rows = await LetterheadPresetModel.find(query).sort({ scope: 1, name: 1 }).lean();
      return res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(normalizeRole(req.user?.role))) return res.status(403).json({ success: false, message: "Admin only." });
      const name = String(req.body?.name || "").trim();
      if (!name) return res.status(400).json({ success: false, message: "name is required." });
      const created = await LetterheadPresetModel.create({
        name,
        scope: String(req.body?.scope || "GLOBAL").toUpperCase(),
        companyId: Types.ObjectId.isValid(String(req.body?.companyId || "")) ? new Types.ObjectId(String(req.body.companyId)) : null,
        logoUrl: String(req.body?.logoUrl || ""),
        headerHtml: String(req.body?.headerHtml || ""),
        footerHtml: String(req.body?.footerHtml || ""),
        watermark: String(req.body?.watermark || ""),
        spacing: req.body?.spacing || undefined,
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
      ["name", "logoUrl", "headerHtml", "footerHtml", "watermark"].forEach((k) => {
        if (req.body?.[k] !== undefined) update[k] = String(req.body[k] || "");
      });
      if (req.body?.scope !== undefined) update.scope = String(req.body.scope || "GLOBAL").toUpperCase();
      if (req.body?.companyId !== undefined) {
        update.companyId = Types.ObjectId.isValid(String(req.body.companyId || "")) ? new Types.ObjectId(String(req.body.companyId)) : null;
      }
      if (req.body?.spacing !== undefined) update.spacing = req.body.spacing;
      if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);
      const row = await LetterheadPresetModel.findByIdAndUpdate(id, update, { new: true });
      if (!row) return res.status(404).json({ success: false, message: "Preset not found." });
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
      const row = await LetterheadPresetModel.findByIdAndUpdate(id, { isDeleted: true, isActive: false }, { new: true });
      if (!row) return res.status(404).json({ success: false, message: "Preset not found." });
      return res.json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  }
}
