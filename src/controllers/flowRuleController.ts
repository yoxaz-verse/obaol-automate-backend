import { Request, Response, NextFunction } from "express";
import { FlowRuleModel } from "../database/models/flowRule";
import { ensureDefaultFlowRules, seedDefaultFlowRules } from "../utils/flowRules";

const DEFAULT_FLOW_TYPES = new Set([
  "TRADE_ENQUIRY",
  "TRADE_ORDER",
  "SAMPLING",
  "WAREHOUSE",
  "PROCUREMENT",
  "INLAND_TRANSPORTATION",
  "PACKAGING",
  "FREIGHT_FORWARDING",
  "INVENTORY",
  "CERTIFICATION",
  "QUALITY_QA",
]);

const FLOW_TYPE_ALIASES: Record<string, string> = {
  INTERNAL_LOGISTICS: "INLAND_TRANSPORTATION",
  INLAND_LOGISTICS: "INLAND_TRANSPORTATION",
  LOGISTICS: "INLAND_TRANSPORTATION",
  ENQUIRY_FLOW: "TRADE_ENQUIRY",
  ORDER_FLOW: "TRADE_ORDER",
};

const normalizeFlowType = (value: unknown): string | undefined => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return undefined;
  return FLOW_TYPE_ALIASES[raw] || raw;
};

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";

export class FlowRuleController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      await ensureDefaultFlowRules();
      const query: any = { isDeleted: { $ne: true } };
      if (req.query?.isActive !== undefined) query.isActive = String(req.query.isActive) === "true";
      if (req.query?.flowType) {
        const normalized = normalizeFlowType(req.query.flowType);
        if (!normalized || !DEFAULT_FLOW_TYPES.has(normalized)) {
          return res.status(400).json({ success: false, message: "Unknown flowType; no defaults available." });
        }
        query.flowType = normalized;
      }
      let rows = await FlowRuleModel.find(query).sort({ sortOrder: 1 }).lean();
      if (query.flowType && rows.length === 0) {
        await seedDefaultFlowRules(true, query.flowType);
        rows = await FlowRuleModel.find(query).sort({ sortOrder: 1 }).lean();
      }
      return res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) return res.status(403).json({ success: false, message: "Admin only." });

      const payload: any = {
        flowType: String(req.body?.flowType || "").toUpperCase().trim(),
        stageKey: String(req.body?.stageKey || "").toUpperCase().trim(),
        label: String(req.body?.label || "").trim(),
        description: String(req.body?.description || "").trim(),
        sortOrder: Number(req.body?.sortOrder || 0),
        isActive: req.body?.isActive !== false,
        requiredActions: Array.isArray(req.body?.requiredActions)
          ? req.body.requiredActions.map((a: any) => String(a).toUpperCase())
          : [],
        requiredActionMode: String(req.body?.requiredActionMode || "ALL").toUpperCase(),
        triggersOrderCreation: Boolean(req.body?.triggersOrderCreation),
        triggersClose: Boolean(req.body?.triggersClose),
        tradeType: String(req.body?.tradeType || "BOTH").toUpperCase(),
      };

      if (!payload.flowType || !payload.stageKey || !payload.label) {
        return res.status(400).json({ success: false, message: "flowType, stageKey and label are required." });
      }

      const created = await FlowRuleModel.create(payload);
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
      if (req.body?.flowType !== undefined) update.flowType = String(req.body.flowType).toUpperCase().trim();
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
      if (req.body?.requiredActionMode !== undefined) {
        update.requiredActionMode = String(req.body.requiredActionMode || "ALL").toUpperCase();
      }
      if (req.body?.triggersOrderCreation !== undefined) update.triggersOrderCreation = Boolean(req.body.triggersOrderCreation);
      if (req.body?.triggersClose !== undefined) update.triggersClose = Boolean(req.body.triggersClose);
      if (req.body?.tradeType !== undefined) update.tradeType = String(req.body.tradeType || "BOTH").toUpperCase();

      const updated = await FlowRuleModel.findByIdAndUpdate(id, update, { new: true });
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
      const updated = await FlowRuleModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "Rule not found." });
      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async seed(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      if (!isAdmin(role)) return res.status(403).json({ success: false, message: "Admin only." });
      const force = String(req.query?.force || "").toLowerCase() === "true";
      const flowType = req.query?.flowType ? normalizeFlowType(req.query.flowType) : undefined;
      if (req.query?.flowType && (!flowType || !DEFAULT_FLOW_TYPES.has(flowType))) {
        return res.status(400).json({ success: false, message: "Unknown flowType; no defaults available." });
      }
      await seedDefaultFlowRules(force, flowType);
      const query: any = { isDeleted: { $ne: true } };
      if (flowType) query.flowType = String(flowType).toUpperCase();
      const rows = await FlowRuleModel.find(query).sort({ sortOrder: 1 }).lean();
      return res.json({ success: true, data: rows, seeded: true, forced: force });
    } catch (error) {
      next(error);
    }
  }
}

export const flowRuleController = new FlowRuleController();
