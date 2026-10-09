import mongoose from "mongoose";
import { CustomerSupportAgentModel } from "../database/models/customerSupportAgent";
import { SupportConversationModel } from "../database/models/supportConversation";
import { NotificationModel } from "../database/models/notification";

export const SUPPORT_ONLINE_WINDOW_MS = 5 * 60 * 1000;
export const SUPPORT_AGENT_CAPACITY = 3;

export const normalizeSupportRole = (role: unknown) => String(role || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
export const isSupportAgentRole = (role: unknown) => normalizeSupportRole(role) === "customersupport";
export const isAdminRole = (role: unknown) => normalizeSupportRole(role) === "admin";

export const requeueUnavailableSupportChats = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() - SUPPORT_ONLINE_WINDOW_MS);
  const unavailableAgents = await CustomerSupportAgentModel.find({
    $or: [
      { isActive: false },
      { isDeleted: true },
      { isAvailable: false },
      { lastSeenAt: { $lt: cutoff } },
      { lastSeenAt: null },
    ],
  }).select("_id").lean();

  if (!unavailableAgents.length) return 0;
  const result = await SupportConversationModel.updateMany(
    { status: "ACTIVE", assignedAgent: { $in: unavailableAgents.map((row: any) => row._id) } },
    { $set: { status: "WAITING", assignedAgent: null, claimedAt: null } }
  );
  await syncSupportAgentLoads(unavailableAgents.map((row: any) => row._id));
  return Number((result as any).modifiedCount || 0);
};

export const syncSupportAgentLoads = async (agentIds?: any[]) => {
  const match: any = { status: "ACTIVE", assignedAgent: { $ne: null } };
  if (agentIds?.length) match.assignedAgent = { $in: agentIds };
  const counts = await SupportConversationModel.aggregate([
    { $match: match },
    { $group: { _id: "$assignedAgent", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((row: any) => [String(row._id), Number(row.count || 0)]));
  const filter: any = agentIds?.length ? { _id: { $in: agentIds } } : {};
  const agents = await CustomerSupportAgentModel.find(filter).select("_id").lean();
  if (agents.length) {
    await CustomerSupportAgentModel.bulkWrite(agents.map((agent: any) => ({
      updateOne: { filter: { _id: agent._id }, update: { $set: { activeChatCount: countMap.get(String(agent._id)) || 0 } } },
    })));
  }
};

export const reserveSupportAgentSlot = async (agentId: any, now = new Date()) => CustomerSupportAgentModel.findOneAndUpdate(
  { _id: agentId, isDeleted: { $ne: true }, isActive: { $ne: false }, isAvailable: true, lastSeenAt: { $gte: new Date(now.getTime() - SUPPORT_ONLINE_WINDOW_MS) }, activeChatCount: { $lt: SUPPORT_AGENT_CAPACITY } },
  { $inc: { activeChatCount: 1 } },
  { new: true }
);

export const releaseSupportAgentSlot = async (agentId: any) => {
  if (!agentId) return;
  await CustomerSupportAgentModel.updateOne({ _id: agentId, activeChatCount: { $gt: 0 } }, { $inc: { activeChatCount: -1 } });
};

export const getSupportAgentSnapshot = async (now = new Date()) => {
  await requeueUnavailableSupportChats(now);
  const cutoff = new Date(now.getTime() - SUPPORT_ONLINE_WINDOW_MS);
  const agents = await CustomerSupportAgentModel.find({
    isDeleted: { $ne: true },
    isActive: { $ne: false },
    lastSeenAt: { $gte: cutoff },
  }).select("name email phone lastSeenAt isAvailable").sort({ name: 1 }).lean();

  const counts = agents.length
    ? await SupportConversationModel.aggregate([
        { $match: { status: "ACTIVE", assignedAgent: { $in: agents.map((row: any) => row._id) } } },
        { $group: { _id: "$assignedAgent", count: { $sum: 1 } } },
      ])
    : [];
  const countMap = new Map(counts.map((row: any) => [String(row._id), Number(row.count || 0)]));
  const roster = agents.map((agent: any) => {
    const activeChatCount = countMap.get(String(agent._id)) || 0;
    return { ...agent, activeChatCount, capacity: SUPPORT_AGENT_CAPACITY, canAccept: Boolean(agent.isAvailable) && activeChatCount < SUPPORT_AGENT_CAPACITY };
  });
  return roster;
};

export const createSupportNotification = async (params: {
  recipientUserId: any;
  recipientRole: string;
  type: string;
  title: string;
  message: string;
  conversationId: any;
  createdByUserId?: any;
}) => {
  if (!mongoose.Types.ObjectId.isValid(String(params.recipientUserId || ""))) return null;
  return NotificationModel.create({
    recipientUserId: params.recipientUserId,
    recipientRole: params.recipientRole,
    type: params.type,
    title: params.title,
    message: params.message,
    entityType: "SUPPORT",
    entityId: params.conversationId,
    route: "/dashboard/customer-support",
    payload: { conversationId: String(params.conversationId) },
    priority: "high",
    ...(mongoose.Types.ObjectId.isValid(String(params.createdByUserId || "")) ? { createdByUserId: params.createdByUserId } : {}),
  });
};
