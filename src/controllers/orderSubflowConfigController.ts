import { Request, Response, NextFunction } from "express";
import { OrderSubflowConfigModel } from "../database/models/orderSubflowConfig";

class OrderSubflowConfigController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
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
      const payload = {
        subflowType: String(req.body?.subflowType || "").toUpperCase(),
        startAtOrderStage: String(req.body?.startAtOrderStage || "").toUpperCase(),
        mustCompleteBeforeOrderStage: String(req.body?.mustCompleteBeforeOrderStage || "").toUpperCase(),
        dependsOnSubflows: Array.isArray(req.body?.dependsOnSubflows)
          ? req.body.dependsOnSubflows.map((v: string) => String(v).toUpperCase())
          : [],
        isActive: req.body?.isActive !== false,
      };
      if (!payload.subflowType || !payload.startAtOrderStage || !payload.mustCompleteBeforeOrderStage) {
        return res.status(400).json({ success: false, message: "subflowType, startAtOrderStage, and mustCompleteBeforeOrderStage are required." });
      }
      const created = await OrderSubflowConfigModel.create(payload);
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const update: any = {};
      if (req.body?.startAtOrderStage !== undefined) update.startAtOrderStage = String(req.body.startAtOrderStage).toUpperCase();
      if (req.body?.mustCompleteBeforeOrderStage !== undefined) update.mustCompleteBeforeOrderStage = String(req.body.mustCompleteBeforeOrderStage).toUpperCase();
      if (req.body?.dependsOnSubflows !== undefined) {
        update.dependsOnSubflows = Array.isArray(req.body.dependsOnSubflows)
          ? req.body.dependsOnSubflows.map((v: string) => String(v).toUpperCase())
          : [];
      }
      if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);
      if (req.body?.isDeleted !== undefined) update.isDeleted = Boolean(req.body.isDeleted);

      const updated = await OrderSubflowConfigModel.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
      if (!updated) return res.status(404).json({ success: false, message: "Subflow config not found." });
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
