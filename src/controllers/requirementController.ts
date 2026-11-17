import { Request, Response } from "express";
import { Types } from "mongoose";
import { RequirementModel } from "../database/models/requirement";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { OrderModel } from "../database/models/order";
import { REQUIREMENT_ITEM_TYPES } from "../interfaces/requirement";
import { InlandVehicleModel } from "../database/models/inlandTransportation";

const role = (req: Request) => String(req.user?.role || "").toLowerCase();
const id = (value: unknown) => String(value || "");
const allowedRoles = new Set(["admin", "operator", "team", "associate"]);
const itemTypes = new Set<string>(REQUIREMENT_ITEM_TYPES);
const providerCapabilities: Record<string, string[]> = {
  PROCUREMENT: ["PROCUREMENT", "PROCUREMENT_PARTNER", "SOURCING"],
  QUALITY_TESTING: ["QUALITY_TESTING", "QUALITY_TESTING_PARTNER", "TESTING", "CERTIFICATION"],
  PACKAGING: ["PACKAGING", "PACKAGING_PARTNER"],
  WAREHOUSE: ["WAREHOUSING", "WAREHOUSE_STORAGE"],
  TRANSPORTATION: ["TRANSPORTATION", "INLAND_TRANSPORTATION", "INLAND_LOGISTICS", "LOGISTICS_PARTNER"],
  FREIGHT_FORWARDING: ["FREIGHT_FORWARDING", "SEA_FREIGHT_FORWARDING", "AIR_FREIGHT_FORWARDING", "OCEAN_FREIGHT", "AIR_FREIGHT"],
  CUSTOM_SERVICE: [],
};
const journeys = new Set(["BUY_PRODUCT", "HIRE_SERVICE", "TRACK_EXISTING"]);
const fulfilmentStrategies = new Set(["MATCHED_BIDDING", "INVITE_ONLY", "DIRECT_ASSIGN", "TRACK_ONLY"]);
const identityPolicies = new Set(["IMMEDIATE", "AFTER_AWARD", "PRIVATE"]);
const defaultStages: Record<string, string[]> = {
  BUY_PRODUCT: ["Requirement confirmed", "Offers received", "Supplier selected", "Order confirmed", "Fulfilment in progress", "Delivered"],
  HIRE_SERVICE: ["Brief confirmed", "Provider selected", "Work started", "Review and approval", "Service completed"],
  TRACK_EXISTING: ["Work registered", "Provider acknowledged", "Work in progress", "Review and evidence", "Completed"],
};

const actor = async (req: Request) => {
  if (!req.user?.id || !allowedRoles.has(role(req))) return null;
  if (role(req) !== "associate") return { userId: id(req.user.id), companyId: id(req.user.associateCompany) };
  const row: any = await AssociateModel.findById(req.user.id).select("associateCompany").lean();
  return { userId: id(req.user.id), companyId: id(row?.associateCompany) };
};

const reference = () => `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const escaped = (value: unknown) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const customProviderQuery = (row: any, item: any) => {
  const phrases = [row.serviceCategory, row.customServiceName, item.title]
    .map((value) => String(value || "").replace(/_/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);
  const patterns = phrases.map((phrase) => new RegExp(escaped(phrase), "i"));
  return patterns.length ? { $or: [{ providedCapabilities: { $in: patterns } }, { tags: { $in: patterns } }, { name: { $in: patterns } }, { description: { $in: patterns } }] } : { _id: null };
};
const owns = (row: any, who: { userId: string; companyId: string }) => id(row.createdBy) === who.userId || Boolean(who.companyId && id(row.ownerCompanyId) === who.companyId);
const providerView = (row: any, companyId: string) => {
  const awarded = (row.items || []).some((item: any) => id(item.awardedCompanyId) === companyId);
  const revealParties = row.identityVisibility === "IMMEDIATE" || (row.identityVisibility === "AFTER_AWARD" && awarded);
  return { ...row, parties: revealParties ? row.parties : {}, conversation: (row.conversation || []).filter((message: any) => message.visibility !== "REQUESTER_INTERNAL"), items: (row.items || []).filter((item: any) => [item.awardedCompanyId, ...(item.candidateCompanyIds || []), ...(item.invitedCompanyIds || [])].some((value: any) => id(value) === companyId)).map((item: any) => ({ ...item, bids: (item.bids || []).filter((bid: any) => id(bid.companyId) === companyId) })) };
};
const normalizeItems = (items: unknown) => Array.isArray(items) ? items.map((item: any) => ({
  type: String(item?.type || "").toUpperCase(),
  title: String(item?.title || "").trim(),
  specifications: item?.specifications && typeof item.specifications === "object" ? item.specifications : {},
  fulfilmentMethod: String(item?.fulfilmentMethod || "MATCHED_BIDDING").toUpperCase(),
  invitedCompanyIds: Array.isArray(item?.invitedCompanyIds) ? item.invitedCompanyIds.filter(Types.ObjectId.isValid) : [],
  preferredProviderCompanyId: item?.preferredProviderCompanyId && Types.ObjectId.isValid(item.preferredProviderCompanyId) ? item.preferredProviderCompanyId : null,
  preferredVehicleId: item?.preferredVehicleId && Types.ObjectId.isValid(item.preferredVehicleId) ? item.preferredVehicleId : null,
  awardedCompanyId: item?.awardedCompanyId && Types.ObjectId.isValid(item.awardedCompanyId) ? item.awardedCompanyId : null,
  status: "DRAFT",
})) : [];
const normalizeStages = (stages: unknown, journeyType: string) => {
  const source = Array.isArray(stages) && stages.length ? stages : (defaultStages[journeyType] || defaultStages.HIRE_SERVICE).map((label) => ({ label }));
  return source.map((stage: any, index: number) => ({
    key: String(stage?.key || `STAGE_${index + 1}`).trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 80),
    label: String(stage?.label || "").trim().slice(0, 160), description: String(stage?.description || "").trim().slice(0, 1000), sortOrder: index + 1,
    ownerRole: String(stage?.ownerRole || "PROVIDER").toUpperCase(), expectedAt: stage?.expectedAt || null, status: "PENDING",
  })).filter((stage: any) => stage.label);
};
const validatePreferredTransport = async (items: any[]) => {
  for (const item of items) {
    if (!item.preferredVehicleId) continue;
    if (item.type !== "TRANSPORTATION" || !item.preferredProviderCompanyId) return "A preferred truck requires a transport provider.";
    const vehicle = await InlandVehicleModel.exists({ _id: item.preferredVehicleId, companyId: item.preferredProviderCompanyId, publiclyListed: true, status: { $ne: "INACTIVE" } });
    if (!vehicle) return "The selected truck is not available from this transport provider.";
    item.fulfilmentMethod = "INVITE_ONLY"; item.invitedCompanyIds = [item.preferredProviderCompanyId];
  }
  return "";
};

export class RequirementController {
  create = async (req: Request, res: Response) => {
    try {
      const who = await actor(req);
      if (!who) return res.status(403).json({ success: false, message: "Not allowed." });
      const journeyType = String(req.body?.journeyType || (req.body?.mode === "TRADE" ? "BUY_PRODUCT" : "HIRE_SERVICE")).toUpperCase();
      const mode = journeyType === "BUY_PRODUCT" ? "TRADE" : "SERVICE_ONLY";
      const title = String(req.body?.title || "").trim();
      const items = normalizeItems(req.body?.items);
      const fulfilmentStrategy = String(req.body?.fulfilmentStrategy || (journeyType === "TRACK_EXISTING" ? "TRACK_ONLY" : "MATCHED_BIDDING")).toUpperCase();
      const identityVisibility = String(req.body?.identityVisibility || "AFTER_AWARD").toUpperCase();
      if (!journeys.has(journeyType) || !title || !items.length) return res.status(400).json({ success: false, message: "Journey, title, and at least one need are required." });
      if (!fulfilmentStrategies.has(fulfilmentStrategy) || !identityPolicies.has(identityVisibility)) return res.status(400).json({ success: false, message: "Fulfilment or identity visibility is invalid." });
      if (items.some((item: any) => !itemTypes.has(item.type) || !item.title || !["MATCHED_BIDDING", "INVITE_ONLY", "DIRECT_ASSIGN"].includes(item.fulfilmentMethod))) return res.status(400).json({ success: false, message: "One or more requirement items are invalid." });
      if (mode === "TRADE" && !String(req.body?.product?.name || "").trim()) return res.status(400).json({ success: false, message: "A product is required for trade requirements." });
      const preferenceError = await validatePreferredTransport(items); if (preferenceError) return res.status(400).json({ success: false, message: preferenceError });
      const trackingRequested = journeyType === "TRACK_EXISTING";
      const plan = req.body?.trackingPlan || {};
      const row = await RequirementModel.create({ reference: reference(), mode, journeyType, serviceCategory: req.body?.serviceCategory || "", customServiceName: req.body?.customServiceName || "", title, description: req.body?.description, visibility: fulfilmentStrategy === "TRACK_ONLY" ? "PRIVATE" : req.body?.visibility || "MATCHED", identityVisibility, fulfilmentStrategy, budget: req.body?.budget || {}, urgency: req.body?.urgency || "STANDARD", parties: req.body?.parties || {}, trackingPlan: trackingRequested ? { planKey: plan.planKey || "TRACK_STANDARD", label: plan.label || "Standard tracking", feeAmount: Number(plan.feeAmount || 0), currency: plan.currency || "INR", acceptedAt: plan.accepted ? new Date() : null, activationStatus: plan.accepted ? "PENDING" : "NOT_REQUIRED" } : { activationStatus: "NOT_REQUIRED" }, createdBy: who.userId, ownerCompanyId: who.companyId || null, product: req.body?.product || {}, route: req.body?.route || {}, targetDate: req.body?.targetDate || null, attachments: req.body?.attachments || [], items, stages: normalizeStages(req.body?.stages, journeyType), activity: [{ action: "CREATED", actorId: who.userId }] });
      return res.status(201).json({ success: true, data: row });
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message }); }
  };

  list = async (req: Request, res: Response) => {
    try {
      const who = await actor(req);
      if (!who) return res.status(403).json({ success: false, message: "Not allowed." });
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
      const opportunities = String(req.query.view || "") === "opportunities";
      const query: any = role(req) === "admin" ? {} : opportunities && who.companyId
        ? { status: { $nin: ["DRAFT", "CANCELLED"] }, $or: [{ "items.candidateCompanyIds": who.companyId }, { "items.invitedCompanyIds": who.companyId }, { "items.awardedCompanyId": who.companyId }] }
        : { $or: [{ createdBy: who.userId }, ...(who.companyId ? [{ ownerCompanyId: who.companyId }] : [])] };
      if (req.query.status) query.status = String(req.query.status).toUpperCase();
      const [data, total] = await Promise.all([RequirementModel.find(query).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), RequirementModel.countDocuments(query)]);
      const legacy = String(req.query.includeLegacy || "true") !== "false" && !opportunities
        ? await OrderModel.find({ isExternal: true, ...(role(req) === "admin" ? {} : { externalCreatedBy: who.userId }) }).sort({ updatedAt: -1 }).limit(limit).lean()
        : [];
      const visibleData = opportunities && role(req) !== "admin" ? data.map((row: any) => providerView(row, who.companyId)) : data;
      return res.json({ success: true, data: visibleData, legacy: legacy.map((row: any) => ({ ...row, legacy: { type: "EXTERNAL_ORDER", id: row._id }, reference: row.trackingId || `LEGACY-${String(row._id).slice(-6).toUpperCase()}`, title: row.externalProduct?.name || "Legacy external order" })), pagination: { page, limit, total } });
    } catch (error: any) { return res.status(500).json({ success: false, message: error.message }); }
  };

  get = async (req: Request, res: Response) => {
    const who = await actor(req); if (!who) return res.status(403).json({ success: false, message: "Not allowed." });
    const row: any = await RequirementModel.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: "Requirement not found." });
    const provider = row.items?.some((item: any) => [item.awardedCompanyId, ...(item.candidateCompanyIds || []), ...(item.invitedCompanyIds || [])].some((value: any) => id(value) === who.companyId));
    if (role(req) !== "admin" && !owns(row, who) && !provider) return res.status(403).json({ success: false, message: "Not allowed." });
    return res.json({ success: true, data: role(req) === "admin" || owns(row, who) ? row : providerView(row, who.companyId) });
  };

  update = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id);
    if (!who || !row || (role(req) !== "admin" && !owns(row, who))) return res.status(row ? 403 : 404).json({ success: false, message: row ? "Not allowed." : "Requirement not found." });
    if (row.status !== "DRAFT") return res.status(409).json({ success: false, message: "Only draft requirements can be edited." });
    for (const key of ["title", "description", "visibility", "identityVisibility", "fulfilmentStrategy", "serviceCategory", "customServiceName", "budget", "urgency", "parties", "product", "route", "targetDate", "attachments"] as const) if (Object.prototype.hasOwnProperty.call(req.body, key)) row[key] = req.body[key];
    if (req.body.stages) row.stages = normalizeStages(req.body.stages, row.journeyType || "HIRE_SERVICE");
    if (req.body.items) { const items = normalizeItems(req.body.items); const preferenceError = await validatePreferredTransport(items); if (preferenceError) return res.status(400).json({ success: false, message: preferenceError }); row.items = items; }
    row.activity.push({ action: "UPDATED", actorId: who.userId }); await row.save(); return res.json({ success: true, data: row });
  };

  publish = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id);
    if (!who || !row || (role(req) !== "admin" && !owns(row, who))) return res.status(row ? 403 : 404).json({ success: false, message: row ? "Not allowed." : "Requirement not found." });
    if (row.status !== "DRAFT") return res.status(409).json({ success: false, message: "Only draft requirements can be published." });
    const preferenceError = await validatePreferredTransport(row.items); if (preferenceError) return res.status(409).json({ success: false, message: preferenceError });
    if (row.journeyType === "TRACK_EXISTING" && row.trackingPlan?.activationStatus !== "ACTIVE") return res.status(409).json({ success: false, message: "An administrator must activate the accepted tracking plan before launch." });
    const matched = await Promise.all(row.items.map(async (item: any) => item.fulfilmentMethod === "MATCHED_BIDDING"
      ? AssociateCompanyModel.find({ registrationStatus: "APPROVED", _id: { $ne: row.ownerCompanyId }, ...(item.type === "CUSTOM_SERVICE" ? customProviderQuery(row, item) : { providedCapabilities: { $in: providerCapabilities[item.type] || [] } }) }).select("_id").limit(250).lean()
      : []));
    row.status = "PUBLISHED"; row.items.forEach((item: any, index: number) => { item.candidateCompanyIds = matched[index].map((company: any) => company._id); const externallyAssigned = item.fulfilmentMethod === "DIRECT_ASSIGN" && Boolean(row.parties?.providerName); item.status = row.journeyType === "TRACK_EXISTING" ? "IN_EXECUTION" : item.fulfilmentMethod === "DIRECT_ASSIGN" && (item.awardedCompanyId || externallyAssigned) ? "AWARDED" : "OPEN"; if (item.status === "AWARDED") item.awardedAt = new Date(); });
    if (row.journeyType === "TRACK_EXISTING") { row.status = "IN_EXECUTION"; if (row.stages?.length) row.stages[0].status = "IN_PROGRESS"; }
    const awarded = row.items.filter((item: any) => item.status === "AWARDED").length; row.status = awarded === row.items.length ? "AWARDED" : awarded ? "PARTIALLY_AWARDED" : "SOURCING";
    if (row.journeyType === "TRACK_EXISTING") row.status = "IN_EXECUTION";
    row.activity.push({ action: "PUBLISHED", actorId: who.userId }); await row.save(); return res.json({ success: true, data: row });
  };

  bid = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id); const item = row?.items.id(req.params.itemId);
    if (!who?.companyId || !row || !item) return res.status(row ? 404 : 403).json({ success: false, message: row ? "Requirement item not found." : "A company profile is required." });
    if (item.status !== "OPEN" || item.fulfilmentMethod === "DIRECT_ASSIGN") return res.status(409).json({ success: false, message: "This item is not accepting bids." });
    if (item.fulfilmentMethod === "INVITE_ONLY" && !item.invitedCompanyIds.some((value: any) => id(value) === who.companyId)) return res.status(403).json({ success: false, message: "This opportunity is invitation-only." });
    if (item.fulfilmentMethod === "MATCHED_BIDDING" && !item.candidateCompanyIds.some((value: any) => id(value) === who.companyId)) return res.status(403).json({ success: false, message: "Your company is not matched to this opportunity." });
    const existing = item.bids.find((bid: any) => id(bid.companyId) === who.companyId && bid.status !== "WITHDRAWN");
    if (existing) { existing.amount = req.body?.amount; existing.currency = req.body?.currency || "INR"; existing.note = req.body?.note || ""; existing.updatedAt = new Date(); }
    else item.bids.push({ companyId: who.companyId, amount: req.body?.amount, currency: req.body?.currency || "INR", note: req.body?.note || "", status: "SUBMITTED", createdBy: who.userId });
    row.activity.push({ action: "BID_SUBMITTED", actorId: who.userId, metadata: { itemId: item._id } }); await row.save(); return res.json({ success: true, data: row });
  };

  award = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id); const item = row?.items.id(req.params.itemId);
    if (!who || !row || !item || (role(req) !== "admin" && !owns(row, who))) return res.status(row && item ? 403 : 404).json({ success: false, message: row && item ? "Not allowed." : "Requirement item not found." });
    const companyId = String(req.body?.companyId || ""); if (!Types.ObjectId.isValid(companyId)) return res.status(400).json({ success: false, message: "A valid provider company is required." });
    item.awardedCompanyId = companyId; item.awardedAt = new Date(); item.status = "AWARDED"; item.bids.forEach((bid: any) => { bid.status = id(bid.companyId) === companyId ? "AWARDED" : "NOT_SELECTED"; });
    const awarded = row.items.filter((x: any) => x.status === "AWARDED" || x.status === "IN_EXECUTION" || x.status === "COMPLETED").length; row.status = awarded === row.items.length ? "AWARDED" : "PARTIALLY_AWARDED";
    row.activity.push({ action: "ITEM_AWARDED", actorId: who.userId, metadata: { itemId: item._id, companyId } }); await row.save(); return res.json({ success: true, data: row });
  };

  updateItemStatus = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id); const item = row?.items.id(req.params.itemId);
    if (!who || !row || !item) return res.status(row ? 404 : 403).json({ success: false, message: row ? "Requirement item not found." : "Not allowed." });
    const owner = role(req) === "admin" || owns(row, who); const provider = who.companyId && id(item.awardedCompanyId) === who.companyId;
    if (!owner && !provider) return res.status(403).json({ success: false, message: "Only the requester or awarded provider can update execution." });
    const next = String(req.body?.status || "").toUpperCase();
    const allowed: Record<string, string[]> = { AWARDED: ["IN_EXECUTION", "CANCELLED"], IN_EXECUTION: ["COMPLETED", "CANCELLED"] };
    if (!allowed[item.status]?.includes(next)) return res.status(409).json({ success: false, message: `Cannot move this item from ${item.status} to ${next}.` });
    item.status = next;
    const statuses = row.items.map((value: any) => value.status);
    row.status = statuses.every((value: string) => value === "COMPLETED") ? "COMPLETED" : statuses.some((value: string) => value === "IN_EXECUTION") ? "IN_EXECUTION" : row.status;
    row.activity.push({ action: `ITEM_${next}`, actorId: who.userId, metadata: { itemId: item._id } }); await row.save(); return res.json({ success: true, data: row });
  };

  updateStage = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id); const stage = row?.stages.id(req.params.stageId);
    if (!who || !row || !stage) return res.status(row ? 404 : 403).json({ success: false, message: row ? "Stage not found." : "Not allowed." });
    const provider = row.items?.some((item: any) => id(item.awardedCompanyId) === who.companyId);
    if (role(req) !== "admin" && !owns(row, who) && !provider) return res.status(403).json({ success: false, message: "Not allowed." });
    const next = String(req.body?.status || stage.status).toUpperCase();
    if (!["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "SKIPPED"].includes(next)) return res.status(400).json({ success: false, message: "Invalid stage status." });
    stage.status = next; stage.notes = String(req.body?.notes ?? stage.notes ?? "").slice(0, 4000); stage.evidenceUrls = Array.isArray(req.body?.evidenceUrls) ? req.body.evidenceUrls.slice(0, 20) : stage.evidenceUrls; stage.updatedBy = who.userId; stage.completedAt = next === "COMPLETED" ? new Date() : null;
    if (row.stages.every((value: any) => ["COMPLETED", "SKIPPED"].includes(value.status))) row.status = "COMPLETED";
    row.activity.push({ action: "STAGE_UPDATED", actorId: who.userId, metadata: { stageId: stage._id, status: next } }); await row.save(); return res.json({ success: true, data: row });
  };

  addMessage = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id); const body = String(req.body?.body || "").trim();
    if (!who || !row) return res.status(row ? 403 : 404).json({ success: false, message: row ? "Not allowed." : "Requirement not found." });
    const provider = row.items?.some((item: any) => [item.awardedCompanyId, ...(item.candidateCompanyIds || []), ...(item.invitedCompanyIds || [])].some((value: any) => id(value) === who.companyId));
    if (role(req) !== "admin" && !owns(row, who) && !provider) return res.status(403).json({ success: false, message: "Not allowed." });
    if (!body) return res.status(400).json({ success: false, message: "Message is required." });
    row.conversation.push({ authorId: who.userId, authorRole: role(req).toUpperCase(), body, attachmentUrls: Array.isArray(req.body?.attachmentUrls) ? req.body.attachmentUrls.slice(0, 10) : [], visibility: req.body?.visibility === "REQUESTER_INTERNAL" ? "REQUESTER_INTERNAL" : "ALL_PARTICIPANTS" });
    row.activity.push({ action: "MESSAGE_ADDED", actorId: who.userId }); await row.save(); return res.status(201).json({ success: true, data: row });
  };

  activateTracking = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id);
    if (!who || !row) return res.status(row ? 403 : 404).json({ success: false, message: row ? "Not allowed." : "Requirement not found." });
    if (role(req) !== "admin") return res.status(403).json({ success: false, message: "Administrator activation is required." });
    if (row.journeyType !== "TRACK_EXISTING" || row.trackingPlan?.activationStatus !== "PENDING") return res.status(409).json({ success: false, message: "Tracking is not awaiting activation." });
    row.trackingPlan.activationStatus = "ACTIVE"; row.activity.push({ action: "TRACKING_ACTIVATED", actorId: who.userId }); await row.save(); return res.json({ success: true, data: row });
  };

  cancel = async (req: Request, res: Response) => {
    const who = await actor(req); const row: any = await RequirementModel.findById(req.params.id);
    if (!who || !row || (role(req) !== "admin" && !owns(row, who))) return res.status(row ? 403 : 404).json({ success: false, message: row ? "Not allowed." : "Requirement not found." });
    row.status = "CANCELLED"; row.items.forEach((item: any) => { if (!["COMPLETED", "CANCELLED"].includes(item.status)) item.status = "CANCELLED"; }); row.activity.push({ action: "CANCELLED", actorId: who.userId }); await row.save(); return res.json({ success: true, data: row });
  };
}
