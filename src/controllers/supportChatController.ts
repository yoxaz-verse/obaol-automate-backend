import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import { OperatorModel } from "../database/models/operator";
import { ProjectManagerModel } from "../database/models/projectManager";
import { CustomerSupportAgentModel } from "../database/models/customerSupportAgent";
import { SupportConversationModel } from "../database/models/supportConversation";
import { SupportMessageModel } from "../database/models/supportMessage";
import {
  createSupportNotification,
  getSupportAgentSnapshot,
  isAdminRole,
  isSupportAgentRole,
  normalizeSupportRole,
  releaseSupportAgentSlot,
  reserveSupportAgentSlot,
  requeueUnavailableSupportChats,
  syncSupportAgentLoads,
} from "../services/supportChatService";

const validId = (value: unknown) => mongoose.Types.ObjectId.isValid(String(value || ""));
const userId = (req: Request) => String(req.user?.id || "");
const role = (req: Request) => String(req.user?.role || "");

const getRequesterModel = (requesterRole: string) => {
  switch (normalizeSupportRole(requesterRole)) {
    case "admin": return AdminModel;
    case "associate": return AssociateModel;
    case "operator": case "team": return OperatorModel;
    case "inventorymanager": case "activitymanager": return InventoryManagerModel;
    case "projectmanager": return ProjectManagerModel;
    default: return null;
  }
};

const requesterProfile = async (conversation: any) => {
  const model = getRequesterModel(conversation.requesterRole);
  if (!model) return null;
  const query: any = (model as any).findById(conversation.requesterId).select("name email phone lastSeenAt associateCompany");
  if (normalizeSupportRole(conversation.requesterRole) === "associate") query.populate("associateCompany", "name");
  const row: any = await query.lean();
  if (!row) return null;
  const priorConversations = await SupportConversationModel.find({ requesterId: conversation.requesterId, _id: { $ne: conversation._id } })
    .select("subject status resolvedAt createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  return {
    id: String(row._id), name: row.name || "User", email: row.email || "", phone: row.phone || "",
    role: conversation.requesterRole, lastSeenAt: row.lastSeenAt || null,
    company: row.associateCompany?.name || "",
    priorConversations,
  };
};

const serializeConversation = async (conversation: any, includeProfile = false) => {
  const plain = typeof conversation?.toObject === "function" ? conversation.toObject() : conversation;
  return {
    ...plain,
    ...(includeProfile ? { requester: await requesterProfile(plain) } : {}),
  };
};

const canView = (req: Request, conversation: any) => {
  if (isAdminRole(role(req))) return true;
  if (isSupportAgentRole(role(req))) {
    return conversation.status === "WAITING" || String(conversation.assignedAgent || "") === userId(req);
  }
  return String(conversation.requesterId || "") === userId(req);
};

const notifyAvailableAgents = async (conversation: any, senderId?: string) => {
  const agents = await getSupportAgentSnapshot();
  await Promise.all(agents.filter((agent: any) => agent.canAccept).map((agent: any) => createSupportNotification({
    recipientUserId: agent._id,
    recipientRole: "CustomerSupport",
    type: "SUPPORT_CHAT_WAITING",
    title: "New customer support request",
    message: conversation.subject,
    conversationId: conversation._id,
    createdByUserId: senderId,
  })));
};

export class SupportChatController {
  async availability(req: Request, res: Response, next: NextFunction) {
    try {
      const roster = await getSupportAgentSnapshot();
      const canAccept = roster.filter((agent: any) => agent.canAccept);
      const waitingCount = await SupportConversationModel.countDocuments({ status: "WAITING" });
      return res.json({ success: true, data: { online: canAccept.length > 0, availableAgentCount: canAccept.length, onlineAgentCount: roster.length, waitingCount } });
    } catch (error) { next(error); }
  }

  async onlineAgents(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdminRole(role(req)) && !isSupportAgentRole(role(req))) return res.status(403).json({ success: false, message: "Support staff only." });
      return res.json({ success: true, data: await getSupportAgentSnapshot() });
    } catch (error) { next(error); }
  }

  async setAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isSupportAgentRole(role(req))) return res.status(403).json({ success: false, message: "Customer support agents only." });
      if (typeof req.body?.isAvailable !== "boolean") return res.status(400).json({ success: false, message: "isAvailable must be a boolean." });
      const isAvailable = req.body.isAvailable;
      const agent = await CustomerSupportAgentModel.findOneAndUpdate(
        { _id: userId(req), isDeleted: { $ne: true }, isActive: { $ne: false } },
        { $set: { isAvailable, availabilityUpdatedAt: new Date() } },
        { new: true }
      ).select("name email phone isAvailable lastSeenAt").lean();
      if (!agent) return res.status(404).json({ success: false, message: "Support agent not found or inactive." });
      if (!isAvailable) await requeueUnavailableSupportChats();
      return res.json({ success: true, data: agent });
    } catch (error) { next(error); }
  }

  async createConversation(req: Request, res: Response, next: NextFunction) {
    try {
      if (isSupportAgentRole(role(req))) return res.status(403).json({ success: false, message: "Support agents cannot create customer requests." });
      const subject = String(req.body?.subject || "").trim();
      const body = String(req.body?.message || "").trim();
      if (!subject || !body) return res.status(400).json({ success: false, message: "Subject and message are required." });
      const existing = await SupportConversationModel.findOne({ requesterId: userId(req), status: { $in: ["WAITING", "ACTIVE"] } });
      if (existing) return res.status(409).json({ success: false, message: "You already have an unresolved support conversation.", data: await serializeConversation(existing) });

      const now = new Date();
      const conversation = await SupportConversationModel.create({
        requesterId: userId(req), requesterRole: role(req), subject,
        lastMessageAt: now, lastMessagePreview: body.slice(0, 240),
      });
      await SupportMessageModel.create({ conversationId: conversation._id, senderId: userId(req), senderRole: role(req), body });
      await notifyAvailableAgents(conversation, userId(req));
      return res.status(201).json({ success: true, data: await serializeConversation(conversation) });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return res.status(409).json({ success: false, message: "You already have an unresolved support conversation." });
      next(error);
    }
  }

  async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      await requeueUnavailableSupportChats();
      const roleValue = role(req);
      const filter: any = {};
      if (isSupportAgentRole(roleValue)) {
        filter.$or = [{ status: "WAITING" }, { assignedAgent: userId(req) }];
      } else if (!isAdminRole(roleValue)) {
        filter.requesterId = userId(req);
      }
      const requestedStatus = String(req.query.status || "").toUpperCase();
      if (["WAITING", "ACTIVE", "RESOLVED"].includes(requestedStatus)) filter.status = requestedStatus;
      const rows = await SupportConversationModel.find(filter)
        .populate("assignedAgent", "name email phone isAvailable lastSeenAt")
        .sort({ status: 1, createdAt: 1, lastMessageAt: -1 })
        .limit(200).lean();
      const includeProfiles = isAdminRole(roleValue) || isSupportAgentRole(roleValue);
      return res.json({ success: true, data: await Promise.all(rows.map((row: any) => serializeConversation(row, includeProfiles))) });
    } catch (error) { next(error); }
  }

  async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid conversation id." });
      const conversation: any = await SupportConversationModel.findById(req.params.id).populate("assignedAgent", "name email phone isAvailable lastSeenAt").lean();
      if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
      if (!canView(req, conversation)) return res.status(403).json({ success: false, message: "You cannot access this conversation." });
      return res.json({ success: true, data: await serializeConversation(conversation, isAdminRole(role(req)) || isSupportAgentRole(role(req))) });
    } catch (error) { next(error); }
  }

  async claim(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isSupportAgentRole(role(req))) return res.status(403).json({ success: false, message: "Customer support agents only." });
      const agent = await reserveSupportAgentSlot(userId(req));
      if (!agent) return res.status(409).json({ success: false, message: "Set yourself to Available and ensure you have fewer than three active chats." });
      const conversation: any = await SupportConversationModel.findOneAndUpdate(
        { _id: req.params.id, status: "WAITING", assignedAgent: null },
        { $set: { status: "ACTIVE", assignedAgent: userId(req), claimedAt: new Date() } },
        { new: true }
      );
      if (!conversation) {
        await releaseSupportAgentSlot(userId(req));
        return res.status(409).json({ success: false, message: "This conversation was already claimed." });
      }
      await createSupportNotification({ recipientUserId: conversation.requesterId, recipientRole: conversation.requesterRole, type: "SUPPORT_CHAT_CLAIMED", title: "Support joined your conversation", message: `${agent.name} is ready to help.`, conversationId: conversation._id, createdByUserId: userId(req) });
      return res.json({ success: true, data: await serializeConversation(conversation, true) });
    } catch (error) { next(error); }
  }

  async reassign(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdminRole(role(req))) return res.status(403).json({ success: false, message: "Admin only." });
      const agentId = String(req.body?.agentId || "");
      if (!validId(agentId)) return res.status(400).json({ success: false, message: "A valid agent is required." });
      const agent = await CustomerSupportAgentModel.findOne({ _id: agentId, isDeleted: { $ne: true }, isActive: { $ne: false } });
      if (!agent) return res.status(404).json({ success: false, message: "Support agent not found." });
      const current: any = await SupportConversationModel.findOne({ _id: req.params.id, status: { $in: ["WAITING", "ACTIVE"] } }).select("assignedAgent").lean();
      if (!current) return res.status(404).json({ success: false, message: "Open conversation not found." });
      const previousAgentId = current.assignedAgent ? String(current.assignedAgent) : "";
      if (previousAgentId !== agentId) {
        const reserved = await reserveSupportAgentSlot(agentId);
        if (!reserved) return res.status(409).json({ success: false, message: "That agent is unavailable or already at capacity." });
      }
      const conversation: any = await SupportConversationModel.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ["WAITING", "ACTIVE"] }, assignedAgent: current.assignedAgent || null },
        { $set: { status: "ACTIVE", assignedAgent: agentId, claimedAt: new Date() } },
        { new: true }
      );
      if (!conversation) {
        if (previousAgentId !== agentId) await releaseSupportAgentSlot(agentId);
        return res.status(404).json({ success: false, message: "Open conversation not found." });
      }
      if (previousAgentId && previousAgentId !== agentId) await releaseSupportAgentSlot(previousAgentId);
      await Promise.all([
        createSupportNotification({ recipientUserId: conversation.requesterId, recipientRole: conversation.requesterRole, type: "SUPPORT_CHAT_ASSIGNED", title: "Your support conversation was assigned", message: `${agent.name} is ready to help.`, conversationId: conversation._id, createdByUserId: userId(req) }),
        createSupportNotification({ recipientUserId: agent._id, recipientRole: "CustomerSupport", type: "SUPPORT_CHAT_ASSIGNED", title: "Support conversation assigned to you", message: conversation.subject, conversationId: conversation._id, createdByUserId: userId(req) }),
      ]);
      return res.json({ success: true, data: await serializeConversation(conversation, true) });
    } catch (error) { next(error); }
  }

  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation: any = await SupportConversationModel.findById(req.params.id);
      if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
      const owns = String(conversation.requesterId) === userId(req);
      const assigned = isSupportAgentRole(role(req)) && String(conversation.assignedAgent || "") === userId(req);
      if (!owns && !assigned && !isAdminRole(role(req))) return res.status(403).json({ success: false, message: "You cannot resolve this conversation." });
      if (conversation.status === "RESOLVED") return res.json({ success: true, data: conversation });
      const now = new Date();
      conversation.status = "RESOLVED";
      conversation.isOpen = false;
      conversation.resolvedAt = now;
      conversation.resolvedBy = userId(req);
      conversation.reopenUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await conversation.save();
      if (conversation.assignedAgent) await releaseSupportAgentSlot(conversation.assignedAgent);
      return res.json({ success: true, data: conversation });
    } catch (error) { next(error); }
  }

  async reopen(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const anotherOpen = await SupportConversationModel.findOne({ requesterId: userId(req), isOpen: true, _id: { $ne: req.params.id } }).select("_id").lean();
      if (anotherOpen) return res.status(409).json({ success: false, message: "Resolve your current support conversation before reopening this one." });
      const conversation: any = await SupportConversationModel.findOneAndUpdate(
        { _id: req.params.id, requesterId: userId(req), status: "RESOLVED", reopenUntil: { $gte: now } },
        { $set: { status: "WAITING", isOpen: true, assignedAgent: null, claimedAt: null, resolvedAt: null, resolvedBy: null, reopenUntil: null } },
        { new: true }
      );
      if (!conversation) return res.status(409).json({ success: false, message: "This conversation can no longer be reopened." });
      await notifyAvailableAgents(conversation, userId(req));
      await syncSupportAgentLoads();
      return res.json({ success: true, data: conversation });
    } catch (error: any) {
      if (Number(error?.code) === 11000) return res.status(409).json({ success: false, message: "You already have an unresolved support conversation." });
      next(error);
    }
  }

  async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation: any = await SupportConversationModel.findById(req.params.id).lean();
      if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
      if (!canView(req, conversation)) return res.status(403).json({ success: false, message: "You cannot access these messages." });
      const filter: any = { conversationId: conversation._id };
      const after = String(req.query.after || "");
      if (after && !Number.isNaN(new Date(after).getTime())) filter.createdAt = { $gt: new Date(after) };
      const messages = await SupportMessageModel.find(filter).sort({ createdAt: 1 }).limit(500).lean();
      return res.json({ success: true, data: messages });
    } catch (error) { next(error); }
  }

  async postMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const body = String(req.body?.body || "").trim();
      if (!body) return res.status(400).json({ success: false, message: "Message cannot be empty." });
      const conversation: any = await SupportConversationModel.findById(req.params.id);
      if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
      if (conversation.status === "RESOLVED") return res.status(409).json({ success: false, message: "Reopen this conversation before sending a message." });
      const requester = String(conversation.requesterId) === userId(req);
      const assignedAgent = isSupportAgentRole(role(req)) && String(conversation.assignedAgent || "") === userId(req);
      const admin = isAdminRole(role(req));
      if (!requester && !assignedAgent && !admin) return res.status(403).json({ success: false, message: "Only the requester, assigned agent, or an admin can send messages." });
      const message = await SupportMessageModel.create({ conversationId: conversation._id, senderId: userId(req), senderRole: role(req), body });
      conversation.lastMessageAt = message.createdAt || new Date();
      conversation.lastMessagePreview = body.slice(0, 240);
      await conversation.save();

      if (requester && conversation.assignedAgent) {
        await createSupportNotification({ recipientUserId: conversation.assignedAgent, recipientRole: "CustomerSupport", type: "SUPPORT_MESSAGE", title: "New support message", message: body.slice(0, 160), conversationId: conversation._id, createdByUserId: userId(req) });
      } else if (!requester) {
        await createSupportNotification({ recipientUserId: conversation.requesterId, recipientRole: conversation.requesterRole, type: "SUPPORT_MESSAGE", title: "New reply from customer support", message: body.slice(0, 160), conversationId: conversation._id, createdByUserId: userId(req) });
      }
      return res.status(201).json({ success: true, data: message });
    } catch (error) { next(error); }
  }
}

export const supportChatController = new SupportChatController();
