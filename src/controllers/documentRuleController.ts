import { Request, Response, NextFunction } from "express";
import { DocumentRuleModel } from "../database/models/documentRule";
import { ensureDefaultDocumentRules, seedDefaultDocumentRules } from "../utils/documentRules";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";


export class DocumentRuleController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      await ensureDefaultDocumentRules();
      const query: any = { isDeleted: { $ne: true } };
      if (req.query?.stageType) query.stageType = String(req.query.stageType).toUpperCase();
      if (req.query?.stageKey) query.stageKey = String(req.query.stageKey).toUpperCase();
      if (req.query?.docType) query.docType = String(req.query.docType).toUpperCase();
      if (req.query?.isActive !== undefined) query.isActive = String(req.query.isActive) === "true";

      const rows = await DocumentRuleModel.find(query).sort({ stageType: 1, stageKey: 1, sortOrder: 1 }).lean();
      return res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) {
        return res.status(403).json({ success: false, message: "Admin only." });
      }
      const payload = {
        docType: String(req.body?.docType || "").toUpperCase(),
        stageType: String(req.body?.stageType || "").toUpperCase(),
        stageKey: String(req.body?.stageKey || "").toUpperCase(),
        responsibleRole: String(req.body?.responsibleRole || "").toUpperCase(),
        actionType: String(req.body?.actionType || "").toUpperCase(),
        visibility: String(req.body?.visibility || "").toUpperCase(),
        tradeType: String(req.body?.tradeType || "").toUpperCase(),
        isRequired: Boolean(req.body?.isRequired),
        sortOrder: Number(req.body?.sortOrder || 0),
        isActive: req.body?.isActive !== false,
      };
      const created = await DocumentRuleModel.create(payload);
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) {
        return res.status(403).json({ success: false, message: "Admin only." });
      }
      const id = req.params.id;
      const update: any = {};
      const fields = ["docType", "stageType", "stageKey", "responsibleRole", "actionType", "visibility", "tradeType"];
      for (const field of fields) {
        if (req.body?.[field] !== undefined) update[field] = String(req.body[field]).toUpperCase();
      }
      if (req.body?.isRequired !== undefined) update.isRequired = Boolean(req.body.isRequired);
      if (req.body?.sortOrder !== undefined) update.sortOrder = Number(req.body.sortOrder || 0);
      if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);
      const updated = await DocumentRuleModel.findByIdAndUpdate(id, update, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "Rule not found." });
      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) {
        return res.status(403).json({ success: false, message: "Admin only." });
      }
      const id = req.params.id;
      const updated = await DocumentRuleModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "Rule not found." });
      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async seed(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) {
        return res.status(403).json({ success: false, message: "Admin only." });
      }
      const force = String(req.query?.force || "").toLowerCase() === "true";
      await seedDefaultDocumentRules(force);
      const rows = await DocumentRuleModel.find({ isDeleted: { $ne: true } }).sort({ stageType: 1, stageKey: 1, sortOrder: 1 }).lean();
      return res.json({ success: true, data: rows, seeded: true, forced: force });
    } catch (error) {
      next(error);
    }
  }
}
