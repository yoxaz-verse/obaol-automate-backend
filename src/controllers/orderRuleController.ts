import { Request, Response, NextFunction } from "express";
import { OrderRuleModel } from "../database/models/orderRule";
import { ensureDefaultOrderRules } from "../utils/orderRules";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";

export class OrderRuleController {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            await ensureDefaultOrderRules();
            const query: any = { isDeleted: { $ne: true } };
            if (req.query?.isActive !== undefined) query.isActive = String(req.query.isActive) === "true";
            const rows = await OrderRuleModel.find(query).sort({ sortOrder: 1 }).lean();
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
                tradeType: String(req.body?.tradeType || "BOTH").toUpperCase(),
                triggersClose: Boolean(req.body?.triggersClose),
            };

            if (!payload.stageKey || !payload.label) {
                return res.status(400).json({ success: false, message: "stageKey and label are required." });
            }

            const created = await OrderRuleModel.create(payload);
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
            if (req.body?.tradeType !== undefined) update.tradeType = String(req.body.tradeType || "BOTH").toUpperCase();
            if (req.body?.triggersClose !== undefined) update.triggersClose = Boolean(req.body.triggersClose);

            const updated = await OrderRuleModel.findByIdAndUpdate(id, update, { new: true });
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
            const updated = await OrderRuleModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
            if (!updated) return res.status(404).json({ success: false, message: "Rule not found." });
            return res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }
}

export const orderRuleController = new OrderRuleController();
