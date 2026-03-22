import { Request, Response, NextFunction } from "express";
import { OrderSubflowConfigModel } from "../database/models/orderSubflowConfig";
import { FlowRuleModel } from "../database/models/flowRule";

const normalizeStage = (value: unknown) => String(value || "").trim().toUpperCase();

const getOrderStageMap = async () => {
  const stages = await FlowRuleModel.find({
    flowType: "TRADE_ORDER",
    isDeleted: { $ne: true },
  })
    .sort({ sortOrder: 1 })
    .lean();
  const map = new Map<string, number>();
  stages.forEach((stage: any, index: number) => {
    const key = normalizeStage(stage?.stageKey);
    if (key) map.set(key, stage?.sortOrder ?? index);
  });
  return map;
};

const validateBiddingWindow = (
  stageMap: Map<string, number>,
  biddingStart?: string | null,
  biddingEnd?: string | null
) => {
  const start = biddingStart ? normalizeStage(biddingStart) : "";
  const end = biddingEnd ? normalizeStage(biddingEnd) : "";
  if ((start && !end) || (!start && end)) {
    return "Both bidding start and bidding end stages are required.";
  }
  if (start && !stageMap.has(start)) return "Bidding start stage is not a valid order stage.";
  if (end && !stageMap.has(end)) return "Bidding end stage is not a valid order stage.";
  if (start && end) {
    const startOrder = stageMap.get(start) as number;
    const endOrder = stageMap.get(end) as number;
    if (startOrder > endOrder) {
      return "Bidding start stage cannot be after bidding end stage.";
    }
  }
  return null;
};

class OrderSubflowConfigController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await OrderSubflowConfigModel.updateMany(
        { isDeleted: { $ne: true }, subflowType: "INTERNAL_LOGISTICS" },
        { subflowType: "INLAND_LOGISTICS" }
      );
      const configs = await OrderSubflowConfigModel.find({ isDeleted: { $ne: true } })
        .sort({ subflowType: 1 })
        .lean();
      res.json({ success: true, data: configs });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stageMap = await getOrderStageMap();
      const payload = {
        subflowType: String(req.body?.subflowType || "").toUpperCase(),
        startAtOrderStage: normalizeStage(req.body?.startAtOrderStage),
        mustCompleteBeforeOrderStage: normalizeStage(req.body?.mustCompleteBeforeOrderStage),
        biddingStartAtOrderStage: req.body?.biddingStartAtOrderStage
          ? normalizeStage(req.body?.biddingStartAtOrderStage)
          : null,
        biddingEndAtOrderStage: req.body?.biddingEndAtOrderStage
          ? normalizeStage(req.body?.biddingEndAtOrderStage)
          : null,
        dependsOnSubflows: Array.isArray(req.body?.dependsOnSubflows)
          ? req.body.dependsOnSubflows.map((v: string) => String(v).toUpperCase())
          : [],
        isActive: req.body?.isActive !== false,
      };
      if (!payload.subflowType || !payload.startAtOrderStage || !payload.mustCompleteBeforeOrderStage) {
        return res.status(400).json({ success: false, message: "subflowType, startAtOrderStage, and mustCompleteBeforeOrderStage are required." });
      }
      const biddingValidation = validateBiddingWindow(
        stageMap,
        payload.biddingStartAtOrderStage,
        payload.biddingEndAtOrderStage
      );
      if (biddingValidation) {
        return res.status(400).json({ success: false, message: biddingValidation });
      }
      const created = await OrderSubflowConfigModel.create(payload);
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stageMap = await getOrderStageMap();
      const update: any = {};
      if (req.body?.startAtOrderStage !== undefined) update.startAtOrderStage = normalizeStage(req.body.startAtOrderStage);
      if (req.body?.mustCompleteBeforeOrderStage !== undefined) update.mustCompleteBeforeOrderStage = normalizeStage(req.body.mustCompleteBeforeOrderStage);
      if (req.body?.biddingStartAtOrderStage !== undefined) {
        update.biddingStartAtOrderStage = req.body.biddingStartAtOrderStage
          ? normalizeStage(req.body.biddingStartAtOrderStage)
          : null;
      }
      if (req.body?.biddingEndAtOrderStage !== undefined) {
        update.biddingEndAtOrderStage = req.body.biddingEndAtOrderStage
          ? normalizeStage(req.body.biddingEndAtOrderStage)
          : null;
      }
      if (req.body?.dependsOnSubflows !== undefined) {
        update.dependsOnSubflows = Array.isArray(req.body.dependsOnSubflows)
          ? req.body.dependsOnSubflows.map((v: string) => String(v).toUpperCase())
          : [];
      }
      if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);
      if (req.body?.isDeleted !== undefined) update.isDeleted = Boolean(req.body.isDeleted);

      const existing = await OrderSubflowConfigModel.findById(req.params.id).lean();
      if (!existing) return res.status(404).json({ success: false, message: "Subflow config not found." });

      const nextBiddingStart =
        update.biddingStartAtOrderStage !== undefined ? update.biddingStartAtOrderStage : existing.biddingStartAtOrderStage;
      const nextBiddingEnd =
        update.biddingEndAtOrderStage !== undefined ? update.biddingEndAtOrderStage : existing.biddingEndAtOrderStage;
      const biddingValidation = validateBiddingWindow(stageMap, nextBiddingStart, nextBiddingEnd);
      if (biddingValidation) {
        return res.status(400).json({ success: false, message: biddingValidation });
      }

      const updated = await OrderSubflowConfigModel.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await OrderSubflowConfigModel.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true },
        { new: true }
      ).lean();
      if (!updated) return res.status(404).json({ success: false, message: "Subflow config not found." });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };
}

export const orderSubflowConfigController = new OrderSubflowConfigController();
