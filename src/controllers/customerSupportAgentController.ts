import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { CustomerSupportAgentModel } from "../database/models/customerSupportAgent";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import { ProjectManagerModel } from "../database/models/projectManager";
import { isAdminRole } from "../services/supportChatService";

const publicFields = "name email phone role isActive isAvailable availabilityUpdatedAt lastSeenAt lastLoginAt createdAt updatedAt admin";
const emailUsedByAnotherRole = async (email: string) => {
  const rows = await Promise.all([
    AdminModel.exists({ email }), AssociateModel.exists({ email }), OperatorModel.exists({ email }),
    InventoryManagerModel.exists({ email }), ProjectManagerModel.exists({ email }),
  ]);
  return rows.some(Boolean);
};

export class CustomerSupportAgentController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdminRole(req.user?.role)) return res.status(403).json({ success: false, message: "Admin only." });
      const agents = await CustomerSupportAgentModel.find({ isDeleted: { $ne: true } }).select(publicFields).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: agents });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdminRole(req.user?.role)) return res.status(403).json({ success: false, message: "Admin only." });
      const name = String(req.body?.name || "").trim();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
        return res.status(400).json({ success: false, message: "Name, a valid email, and a password of at least 8 characters are required." });
      }
      if (await emailUsedByAnotherRole(email)) return res.status(409).json({ success: false, message: "This email already belongs to another OBAOL account." });
      const agent = await CustomerSupportAgentModel.create({
        name, email, password, phone: String(req.body?.phone || "").trim(), admin: req.user!.id,
        isActive: req.body?.isActive !== false,
      });
      return res.status(201).json({ success: true, data: await CustomerSupportAgentModel.findById(agent._id).select(publicFields).lean() });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return res.status(409).json({ success: false, message: "A customer support account already uses this email." });
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdminRole(req.user?.role)) return res.status(403).json({ success: false, message: "Admin only." });
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid agent id." });
      const agent = await CustomerSupportAgentModel.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
      if (!agent) return res.status(404).json({ success: false, message: "Customer support agent not found." });
      if (req.body?.name !== undefined) agent.name = String(req.body.name || "").trim();
      if (req.body?.email !== undefined) {
        const nextEmail = String(req.body.email || "").trim().toLowerCase();
        if (nextEmail !== agent.email && await emailUsedByAnotherRole(nextEmail)) return res.status(409).json({ success: false, message: "This email already belongs to another OBAOL account." });
        agent.email = nextEmail;
      }
      if (req.body?.phone !== undefined) agent.phone = String(req.body.phone || "").trim();
      if (req.body?.isActive !== undefined) {
        agent.isActive = Boolean(req.body.isActive);
        if (!agent.isActive) agent.isAvailable = false;
      }
      if (req.body?.password !== undefined && String(req.body.password)) {
        if (String(req.body.password).length < 8) return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
        agent.password = String(req.body.password);
      }
      await agent.save();
      return res.json({ success: true, data: await CustomerSupportAgentModel.findById(agent._id).select(publicFields).lean() });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return res.status(409).json({ success: false, message: "A customer support account already uses this email." });
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdminRole(req.user?.role)) return res.status(403).json({ success: false, message: "Admin only." });
      const agent = await CustomerSupportAgentModel.findOneAndUpdate(
        { _id: req.params.id, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, isActive: false, isAvailable: false } },
        { new: true }
      );
      if (!agent) return res.status(404).json({ success: false, message: "Customer support agent not found." });
      return res.json({ success: true });
    } catch (error) { next(error); }
  }
}

export const customerSupportAgentController = new CustomerSupportAgentController();
