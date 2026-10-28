import { Request, Response, NextFunction } from "express";
import { DocumentConversionRuleModel } from "../database/models/documentConversionRule";
import { ensureDefaultDocumentConversionRules } from "../utils/documentConversionRules";

const role = (req: Request) => String(req.user?.role || "").toLowerCase();
const allowedStatuses = new Set(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "CANCELLED"]);
const payload = (req: Request) => ({
  name: String(req.body?.name || "").trim(),
  sourceType: String(req.body?.sourceType || "").toUpperCase(),
  sourceStatuses: [...new Set((Array.isArray(req.body?.sourceStatuses) ? req.body.sourceStatuses : [req.body?.sourceStatus || "ACCEPTED"]).map((value: unknown) => String(value).toUpperCase()).filter((value: string) => allowedStatuses.has(value)))],
  targetKind: String(req.body?.targetKind || "DOCUMENT").toUpperCase(),
  targetDocumentType: String(req.body?.targetDocumentType || "").toUpperCase() || null,
  tradeType: String(req.body?.tradeType || "BOTH").toUpperCase(),
  requiresConfirmation: req.body?.requiresConfirmation !== false,
  displayOrder: Number(req.body?.displayOrder || 0),
  isActive: req.body?.isActive !== false,
});

export class DocumentConversionRuleController {
  async list(req: Request, res: Response, next: NextFunction) { try { await ensureDefaultDocumentConversionRules(); const query: any = { isDeleted: { $ne: true } }; if (req.query.sourceType) query.sourceType = String(req.query.sourceType).toUpperCase(); if (req.query.status) query.sourceStatuses = String(req.query.status).toUpperCase(); if (role(req) !== "admin") query.isActive = true; const rows = await DocumentConversionRuleModel.find(query).sort({ displayOrder: 1, name: 1 }).lean(); return res.json({ success: true, data: rows }); } catch (error) { next(error); } }
  async create(req: Request, res: Response, next: NextFunction) { try { if (role(req) !== "admin") return res.status(403).json({ success: false, message: "Admin only." }); const value = payload(req); if (!value.name || !value.sourceType || !value.sourceStatuses.length || !["DOCUMENT", "ORDER"].includes(value.targetKind) || (value.targetKind === "DOCUMENT" && !value.targetDocumentType)) return res.status(400).json({ success: false, message: "Name, source, at least one valid source status, and conversion target are required." }); const row = await DocumentConversionRuleModel.create({ ...value, createdBy: req.user?.id || null, updatedBy: req.user?.id || null }); return res.status(201).json({ success: true, data: row }); } catch (error) { next(error); } }
  async update(req: Request, res: Response, next: NextFunction) { try { if (role(req) !== "admin") return res.status(403).json({ success: false, message: "Admin only." }); const value = payload(req); if (!value.name || !value.sourceType || !value.sourceStatuses.length || !["DOCUMENT", "ORDER"].includes(value.targetKind) || (value.targetKind === "DOCUMENT" && !value.targetDocumentType)) return res.status(400).json({ success: false, message: "Name, source, at least one valid source status, and conversion target are required." }); const row = await DocumentConversionRuleModel.findOneAndUpdate({ _id: req.params.id, isDeleted: { $ne: true } }, { ...value, updatedBy: req.user?.id || null }, { new: true, runValidators: true }); return row ? res.json({ success: true, data: row }) : res.status(404).json({ success: false, message: "Conversion rule not found." }); } catch (error) { next(error); } }
  async remove(req: Request, res: Response, next: NextFunction) { try { if (role(req) !== "admin") return res.status(403).json({ success: false, message: "Admin only." }); const row = await DocumentConversionRuleModel.findByIdAndUpdate(req.params.id, { isDeleted: true, isActive: false, updatedBy: req.user?.id || null }, { new: true }); return row ? res.json({ success: true }) : res.status(404).json({ success: false, message: "Conversion rule not found." }); } catch (error) { next(error); } }
}
