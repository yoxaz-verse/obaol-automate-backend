import { Request, Response, NextFunction } from "express";
import { EnquiryRuleModel } from "../database/models/enquiryRule";
import { ensureDefaultEnquiryRules } from "../utils/enquiryRules";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";

export class EnquiryRuleController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      await ensureDefaultEnquiryRules();
      const query: any = { isDeleted: { $ne: true } };
      if (req.query?.isActive !== undefined) query.isActive = String(req.query.isActive) === "true";
      const rows = await EnquiryRuleModel.find(query).sort({ sortOrder: 1 }).lean();
      return res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) return res.status(403).json({ success: false, message: "Admin only." });

      const payload = {
        stageKey: String(req.body?.stageKey || "").toUpperCase().trim(),
        label: String(req.body?.label || "").trim(),
        description: String(req.body?.description || "").trim(),
        sortOrder: Number(req.body?.sortOrder || 0),
        isActive: req.body?.isActive !== false,
        requiredActions: Array.isArray(req.body?.requiredActions)
          ? req.body.requiredActions.map((a: any) => String(a).toUpperCase())
          : [],
        triggersOrderCreation: Boolean(req.body?.triggersOrderCreation),
      };

      if (!payload.stageKey || !payload.label) {
        return res.status(400).json({ success: false, message: "stageKey and label are required." });
      }

      const created = await EnquiryRuleModel.create(payload);
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) return res.status(403).json({ success: false, message: "Admin only." });

      const id = req.params.id;
      const update: any = {};
      if (req.body?.stageKey !== undefined) update.stageKey = String(req.body.stageKey).toUpperCase().trim();
      if (req.body?.label !== undefined) update.label = String(req.body.label).trim();
      if (req.body?.description !== undefined) update.description = String(req.body.description).trim();
      if (req.body?.sortOrder !== undefined) update.sortOrder = Number(req.body.sortOrder || 0);
      if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);
      if (req.body?.requiredActions !== undefined) {
        update.requiredActions = Array.isArray(req.body.requiredActions)
          ? req.body.requiredActions.map((a: any) => String(a).toUpperCase())
          : [];
      }
      if (req.body?.triggersOrderCreation !== undefined) update.triggersOrderCreation = Boolean(req.body.triggersOrderCreation);

      const updated = await EnquiryRuleModel.findByIdAndUpdate(id, update, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "Rule not found." });
      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) return res.status(403).json({ success: false, message: "Admin only." });
      const id = req.params.id;
      const updated = await EnquiryRuleModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "Rule not found." });
      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const enquiryRuleController = new EnquiryRuleController();
