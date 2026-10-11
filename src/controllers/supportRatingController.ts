import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";
import { CustomerSupportAgentModel } from "../database/models/customerSupportAgent";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import { OperatorModel } from "../database/models/operator";
import { ProjectManagerModel } from "../database/models/projectManager";
import { SupportConversationModel } from "../database/models/supportConversation";
import { SupportRatingModel } from "../database/models/supportRating";
import { createSupportNotification, isAdminRole, isSupportAgentRole, normalizeSupportRole } from "../services/supportChatService";

const userId = (req: Request) => String(req.user?.id || "");
const role = (req: Request) => String(req.user?.role || "");
const validId = (value: unknown) => mongoose.Types.ObjectId.isValid(String(value || ""));

const requesterModel = (requesterRole: string) => {
  switch (normalizeSupportRole(requesterRole)) {
    case "admin": return AdminModel;
    case "associate": case "customer": return AssociateModel;
    case "operator": case "team": return OperatorModel;
    case "inventorymanager": case "activitymanager": return InventoryManagerModel;
    case "projectmanager": return ProjectManagerModel;
    case "customersupport": return CustomerSupportAgentModel;
    default: return null;
  }
};

const summaryFor = async (filter: Record<string, any>) => {
  const [summary] = await SupportRatingModel.aggregate([
    { $match: filter },
    { $group: { _id: null, averageScore: { $avg: "$score" }, totalRatings: { $sum: 1 }, scores: { $push: "$score" } } },
  ]);
  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  (summary?.scores || []).forEach((score: number) => { distribution[String(score)] = (distribution[String(score)] || 0) + 1; });
  return { averageScore: Number((summary?.averageScore || 0).toFixed(2)), totalRatings: Number(summary?.totalRatings || 0), distribution };
};

export class SupportRatingController {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid conversation id." });
      const score = Number(req.body?.score);
      const comment = String(req.body?.comment || "").trim();
      if (!Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ success: false, message: "Choose a rating from 1 to 5.", errors: { score: "Choose a rating from 1 to 5." } });
      if (comment.length > 1000) return res.status(400).json({ success: false, message: "Feedback must be 1,000 characters or fewer.", errors: { comment: "Use 1,000 characters or fewer." } });

      const conversation: any = await SupportConversationModel.findById(req.params.id).lean();
      if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
      if (String(conversation.requesterId) !== userId(req)) return res.status(403).json({ success: false, message: "Only the requester can rate this conversation." });
      if (conversation.status !== "RESOLVED") return res.status(409).json({ success: false, message: "Resolve the conversation before submitting a rating." });
      if (!conversation.assignedAgent) return res.status(409).json({ success: false, message: "This conversation was not handled by a support agent." });

      const rating = await SupportRatingModel.create({
        conversationId: conversation._id,
        ratedAgentId: conversation.assignedAgent,
        requesterId: conversation.requesterId,
        requesterRole: conversation.requesterRole,
        score,
        comment,
      });
      await createSupportNotification({
        recipientUserId: conversation.assignedAgent,
        recipientRole: "CustomerSupport",
        type: "SUPPORT_RATING_RECEIVED",
        title: "New support rating",
        message: `You received a ${score}-star rating.`,
        conversationId: conversation._id,
      });
      return res.status(201).json({ success: true, data: { score: rating.score, comment: rating.comment, createdAt: rating.createdAt } });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return res.status(409).json({ success: false, message: "This conversation has already been rated." });
      next(error);
    }
  }

  async mine(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isSupportAgentRole(role(req))) return res.status(403).json({ success: false, message: "Customer support agents only." });
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
      const filter = { ratedAgentId: new mongoose.Types.ObjectId(userId(req)) };
      const [summary, total, rows] = await Promise.all([
        summaryFor(filter),
        SupportRatingModel.countDocuments(filter),
        SupportRatingModel.find(filter).select("score comment createdAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ]);
      return res.json({ success: true, data: { summary, ratings: rows }, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdminRole(role(req))) return res.status(403).json({ success: false, message: "Admin only." });
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
      const agentId = String(req.query.agentId || "").trim();
      const score = Number(req.query.score || 0);
      const from = String(req.query.from || "").trim();
      const to = String(req.query.to || "").trim();
      const filter: any = {};
      if (agentId) {
        if (!validId(agentId)) return res.status(400).json({ success: false, message: "Invalid support agent." });
        filter.ratedAgentId = new mongoose.Types.ObjectId(agentId);
      }
      if (score) {
        if (!Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ success: false, message: "Invalid rating score." });
        filter.score = score;
      }
      if (from || to) {
        filter.createdAt = {};
        if (from && !Number.isNaN(new Date(from).getTime())) filter.createdAt.$gte = new Date(from);
        if (to && !Number.isNaN(new Date(to).getTime())) filter.createdAt.$lte = new Date(to);
        if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
      }
      const [summary, total, ratings, agents] = await Promise.all([
        summaryFor(filter),
        SupportRatingModel.countDocuments(filter),
        SupportRatingModel.find(filter).populate("ratedAgentId", "name email").populate("conversationId", "subject").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        CustomerSupportAgentModel.find({ isDeleted: { $ne: true } }).select("name email").sort({ name: 1 }).lean(),
      ]);
      const rows = await Promise.all(ratings.map(async (rating: any) => {
        const model = requesterModel(rating.requesterRole);
        const requester: any = model ? await (model as any).findById(rating.requesterId).select("name email").lean() : null;
        return { ...rating, requester: requester ? { id: String(requester._id), name: requester.name || "User", email: requester.email || "", role: rating.requesterRole } : { id: String(rating.requesterId), name: "User", email: "", role: rating.requesterRole } };
      }));
      return res.json({ success: true, data: { summary, ratings: rows, agents }, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
    } catch (error) { next(error); }
  }
}

export const supportRatingController = new SupportRatingController();
