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
type AgentFieldErrors = Partial<Record<"name" | "email" | "password", string>>;
const emailPattern = /^\S+@\S+\.\S+$/;

const invalidAgentResponse = (res: Response, errors: AgentFieldErrors) => res.status(400).json({
  success: false,
  message: Object.values(errors)[0] || "Please correct the highlighted fields.",
  errors,
});

const mongooseValidationResponse = (error: any, res: Response) => {
  if (String(error?.name || "") === "ValidationError") {
    const errors = Object.fromEntries(Object.entries(error.errors || {}).map(([field, detail]: [string, any]) => [
      field,
      String(detail?.message || `Invalid ${field}.`),
    ]));
    return res.status(400).json({ success: false, message: "The submitted support-agent details are invalid.", errors });
  }
  if (String(error?.name || "") === "CastError") {
    return res.status(400).json({ success: false, message: "The submitted support-agent details are invalid." });
  }
  return null;
};

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
      const errors: AgentFieldErrors = {};
      if (!name) errors.name = "Name is required.";
      if (!emailPattern.test(email)) errors.email = "Enter a valid email address.";
      if (password.length < 8) errors.password = "Password must contain at least 8 characters.";
      if (Object.keys(errors).length) return invalidAgentResponse(res, errors);
      if (await emailUsedByAnotherRole(email)) return res.status(409).json({ success: false, message: "This email already belongs to another OBAOL account.", errors: { email: "This email already belongs to another OBAOL account." } });
      const agent = await CustomerSupportAgentModel.create({
        name, email, password, phone: String(req.body?.phone || "").trim(), admin: req.user!.id,
        isActive: req.body?.isActive !== false,
      });
      return res.status(201).json({ success: true, data: await CustomerSupportAgentModel.findById(agent._id).select(publicFields).lean() });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return res.status(409).json({ success: false, message: "A customer support account already uses this email.", errors: { email: "A customer support account already uses this email." } });
      if (mongooseValidationResponse(error, res)) return;
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdminRole(req.user?.role)) return res.status(403).json({ success: false, message: "Admin only." });
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid agent id." });
      const agent = await CustomerSupportAgentModel.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
      if (!agent) return res.status(404).json({ success: false, message: "Customer support agent not found." });
      const errors: AgentFieldErrors = {};
      if (req.body?.name !== undefined && !String(req.body.name || "").trim()) errors.name = "Name is required.";
      if (req.body?.email !== undefined && !emailPattern.test(String(req.body.email || "").trim().toLowerCase())) errors.email = "Enter a valid email address.";
      if (req.body?.password !== undefined && String(req.body.password) && String(req.body.password).length < 8) errors.password = "Password must contain at least 8 characters.";
      if (Object.keys(errors).length) return invalidAgentResponse(res, errors);
      if (req.body?.name !== undefined) agent.name = String(req.body.name || "").trim();
      if (req.body?.email !== undefined) {
        const nextEmail = String(req.body.email || "").trim().toLowerCase();
        if (nextEmail !== agent.email && await emailUsedByAnotherRole(nextEmail)) return res.status(409).json({ success: false, message: "This email already belongs to another OBAOL account.", errors: { email: "This email already belongs to another OBAOL account." } });
        agent.email = nextEmail;
      }
      if (req.body?.phone !== undefined) agent.phone = String(req.body.phone || "").trim();
      if (req.body?.isActive !== undefined) {
        agent.isActive = Boolean(req.body.isActive);
        if (!agent.isActive) agent.isAvailable = false;
      }
      if (req.body?.password !== undefined && String(req.body.password)) {
        agent.password = String(req.body.password);
      }
      await agent.save();
      return res.json({ success: true, data: await CustomerSupportAgentModel.findById(agent._id).select(publicFields).lean() });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return res.status(409).json({ success: false, message: "A customer support account already uses this email.", errors: { email: "A customer support account already uses this email." } });
      if (mongooseValidationResponse(error, res)) return;
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
