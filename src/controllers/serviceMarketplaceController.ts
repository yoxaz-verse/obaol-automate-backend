import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { InquiryModel } from "../database/models/enquiry";
import { ServiceOfferModel } from "../database/models/serviceOffer";
import { ServiceProviderProfileModel } from "../database/models/serviceProviderProfile";
import { ServiceRequirementModel } from "../database/models/serviceRequirement";
import { ServiceTaxonomyModel } from "../database/models/serviceTaxonomy";
import { ServiceWorkOrderModel } from "../database/models/serviceWorkOrder";
import { SERVICE_TAXONOMY_KINDS, SERVICE_WORK_STATUSES } from "../interfaces/serviceMarketplace";
import { redactServiceRequirement, resolveServiceRequirementStatus, synchronizeServiceRequirements } from "../services/serviceMarketplaceService";
import { notificationService } from "../services/notificationService";

const DEPARTMENT = "PACKAGING";
const id = (v: any) => String(v?._id || v || "");
const valid = (v: any) => Types.ObjectId.isValid(id(v));
const role = (req: Request) => String(req.user?.role || "").toLowerCase();
const staff = (req: Request) => ["admin", "operator", "team"].includes(role(req));
const bad = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });
const actor = async (req: Request) => {
  if (role(req) !== "associate") return { id: id(req.user?.id), companyId: id(req.user?.associateCompany) };
  const row: any = await AssociateModel.findById(req.user?.id).select("associateCompany registrationStatus isActive isDeleted").lean();
  if (!row || row.isDeleted || !row.isActive || row.registrationStatus !== "APPROVED") return null;
  return { id: id(row), companyId: id(row.associateCompany) };
};
const scopedCompanies = async (req: Request) => role(req) === "admin" ? null : ["operator", "team"].includes(role(req)) ? await AssociateCompanyModel.find({ assignedOperator: req.user?.id }).distinct("_id") : [];
const canManageCompany = async (req: Request, companyId: any, own?: string) => role(req) === "admin" || id(companyId) === own || Boolean(await AssociateCompanyModel.exists({ _id: companyId, assignedOperator: req.user?.id }));
const notify = async (recipients: any[], entity: any, type: string, title: string, message: string, actorId?: string) => {
  const recipientMap = new Map<string, "Associate">(); recipients.map(id).filter((x) => valid(x) && x !== actorId).forEach((x) => recipientMap.set(x, "Associate"));
  if (recipientMap.size) await notificationService.createNotifications({ recipientMap, createdByUserId: actorId || null, type, title, message, entityType: "SYSTEM", entityId: entity._id, route: "/dashboard/packaging", payload: { department: DEPARTMENT, entityId: id(entity) } });
};
const populatedProfile = (query: any, path = "published") => {
  let result = query.populate("companyId", "name assignedOperator").populate(`${path}.credentials.certificationId`, "name kind");
  ["serviceIds", "formatIds", "materialIds", "commodityIds", "machineryIds", "qualityOptionIds"].forEach((field) => { result = result.populate(`${path}.capabilities.${field}`, "name kind"); });
  return result;
};
const profileMatchesRequirement = (profile: any, requirement: any) => (profile?.published?.capabilities || []).some((capability: any) => {
  const includes = (values: any[], value: any) => (values || []).map(id).includes(id(value));
  return includes(capability.commodityIds, requirement.commodityId)
    && (!(requirement.serviceIds || []).length || requirement.serviceIds.some((value: any) => includes(capability.serviceIds, value)))
    && (!(requirement.materialIds || []).length || requirement.materialIds.some((value: any) => includes(capability.materialIds, value)))
    && (!(requirement.formatIds || []).length || requirement.formatIds.some((value: any) => includes(capability.formatIds, value)));
});

export const validateServiceProfile = (snapshot: any) => {
  const errors: string[] = [];
  ["displayName", "contactEmail", "contactPhone"].forEach((key) => { if (!String(snapshot?.[key] || "").trim()) errors.push(`${key} is required`); });
  if (!snapshot?.locations?.length) errors.push("At least one operating location is required");
  if (!snapshot?.capabilities?.length) errors.push("At least one packaging capability is required");
  snapshot?.capabilities?.forEach((capability: any, index: number) => {
    if (!String(capability.name || "").trim()) errors.push(`Capability ${index + 1} requires a name`);
    if (!capability.serviceIds?.length || !capability.formatIds?.length || !capability.materialIds?.length || !capability.commodityIds?.length) errors.push(`Capability ${index + 1} requires services, formats, materials, and commodities`);
  });
  return errors;
};

export class ServiceMarketplaceController {
  async taxonomy(req: Request, res: Response) {
    const filter: any = { department: DEPARTMENT, isDeleted: { $ne: true } };
    if (role(req) !== "admin") filter.status = "ACTIVE";
    if (req.query.kind) filter.kind = String(req.query.kind).toUpperCase();
    return res.json({ success: true, data: await ServiceTaxonomyModel.find(filter).sort({ kind: 1, name: 1 }).lean() });
  }
  async createTaxonomy(req: Request, res: Response) {
    if (role(req) !== "admin") return bad(res, 403, "Admin access required.");
    const kind = String(req.body?.kind || "").toUpperCase(), name = String(req.body?.name || "").trim();
    if (!(SERVICE_TAXONOMY_KINDS as readonly string[]).includes(kind) || !name) return bad(res, 400, "Valid kind and name are required.");
    const row = await ServiceTaxonomyModel.create({ department: DEPARTMENT, kind, name, description: req.body?.description || "", status: "ACTIVE", reviewedBy: req.user?.id });
    return res.status(201).json({ success: true, data: row });
  }
  async requestTaxonomy(req: Request, res: Response) {
    const who = await actor(req); if (!who) return bad(res, 403, "Approved associate access required.");
    const kind = String(req.body?.kind || "").toUpperCase(), name = String(req.body?.name || "").trim();
    if (!(SERVICE_TAXONOMY_KINDS as readonly string[]).includes(kind) || !name) return bad(res, 400, "Valid kind and name are required.");
    const row = await ServiceTaxonomyModel.create({ department: DEPARTMENT, kind, name, description: req.body?.description || "", status: "REQUESTED", requestedBy: who.id });
    return res.status(201).json({ success: true, data: row });
  }
  async reviewTaxonomy(req: Request, res: Response) {
    if (role(req) !== "admin") return bad(res, 403, "Admin access required.");
    const status = String(req.body?.status || "").toUpperCase(); if (!["ACTIVE", "REJECTED"].includes(status)) return bad(res, 400, "Status must be ACTIVE or REJECTED.");
    const row = await ServiceTaxonomyModel.findOneAndUpdate({ _id: req.params.id, department: DEPARTMENT }, { $set: { status, reviewNotes: req.body?.reviewNotes || "", reviewedBy: req.user?.id } }, { new: true });
    return row ? res.json({ success: true, data: row }) : bad(res, 404, "Taxonomy item not found.");
  }
  async getDraft(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.query.companyId || who?.companyId || "");
    if (!valid(companyId) || !await canManageCompany(req, companyId, who?.companyId)) return bad(res, 403, "Company access required.");
    const row = await populatedProfile(ServiceProviderProfileModel.findOne({ department: DEPARTMENT, companyId }), "draft").lean();
    return res.json({ success: true, data: row || { department: DEPARTMENT, companyId, status: "DRAFT", draft: null } });
  }
  async saveDraft(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.body?.companyId || who?.companyId || "");
    if (!valid(companyId) || !await canManageCompany(req, companyId, who?.companyId)) return bad(res, 403, "Company access required.");
    const row = await ServiceProviderProfileModel.findOneAndUpdate({ department: DEPARTMENT, companyId }, { $set: { draft: req.body?.snapshot, status: "DRAFT", reviewNotes: "" } }, { upsert: true, new: true, runValidators: true });
    return res.json({ success: true, data: row });
  }
  async submitProfile(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.body?.companyId || who?.companyId || "");
    if (!valid(companyId) || !await canManageCompany(req, companyId, who?.companyId)) return bad(res, 403, "Company access required.");
    const profile: any = await ServiceProviderProfileModel.findOne({ department: DEPARTMENT, companyId }); if (!profile) return bad(res, 404, "Save the profile draft first.");
    const errors = validateServiceProfile(profile.draft); if (errors.length) return res.status(400).json({ success: false, message: errors.join("; "), errors });
    profile.status = "PENDING_REVIEW"; profile.submittedAt = new Date(); await profile.save();
    return res.json({ success: true, data: profile });
  }
  async approvals(req: Request, res: Response) {
    if (!staff(req)) return bad(res, 403, "Staff access required.");
    const filter: any = { department: DEPARTMENT, status: { $in: ["PENDING_REVIEW", "REJECTED"] } }; const scope = await scopedCompanies(req); if (scope) filter.companyId = { $in: scope };
    return res.json({ success: true, data: await populatedProfile(ServiceProviderProfileModel.find(filter), "draft").sort({ submittedAt: 1 }).lean() });
  }
  async reviewProfile(req: Request, res: Response) {
    if (role(req) !== "admin") return bad(res, 403, "Admin access required."); const profile: any = await ServiceProviderProfileModel.findOne({ _id: req.params.id, department: DEPARTMENT });
    if (!profile || !await canManageCompany(req, profile.companyId)) return bad(res, 404, "Profile not found."); const action = String(req.body?.action || "").toUpperCase();
    const verified = new Set((req.body?.verifiedCredentialIds || []).map(String)); profile.draft?.credentials?.forEach((item: any) => { if (verified.has(id(item))) item.verificationStatus = "VERIFIED"; });
    if (action === "APPROVE") { const errors = validateServiceProfile(profile.draft); if (errors.length) return bad(res, 400, errors.join("; ")); profile.published = profile.draft.toObject(); profile.status = "PUBLISHED"; profile.publishedAt = new Date(); }
    else if (action === "REJECT") profile.status = "REJECTED"; else return bad(res, 400, "Action must be APPROVE or REJECT.");
    profile.reviewNotes = String(req.body?.notes || ""); profile.reviewedBy = req.user?.id; await profile.save(); return res.json({ success: true, data: profile });
  }
  async directory(req: Request, res: Response) {
    const query: any = { department: DEPARTMENT, status: "PUBLISHED", published: { $ne: null } }; const search = String(req.query.search || "").trim();
    if (search) query.$or = [{ "published.displayName": new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }, { "published.summary": new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }];
    [["serviceIds", "published.capabilities.serviceIds"], ["formatIds", "published.capabilities.formatIds"], ["materialIds", "published.capabilities.materialIds"], ["commodityIds", "published.capabilities.commodityIds"]].forEach(([input, path]) => { const values = String(req.query[input] || "").split(",").filter(valid); if (values.length) query[path] = { $in: values }; });
    if (req.query.country) query["published.locations.coverageCountries"] = String(req.query.country); if (req.query.state) query["published.locations.coverageStates"] = String(req.query.state);
    const rows = await populatedProfile(ServiceProviderProfileModel.find(query)).sort({ "published.displayName": 1 }).limit(200).lean(); return res.json({ success: true, data: rows });
  }
  async profileDetail(req: Request, res: Response) {
    const row = await populatedProfile(ServiceProviderProfileModel.findOne({ _id: req.params.id, department: DEPARTMENT, status: "PUBLISHED" })).lean(); return row ? res.json({ success: true, data: row }) : bad(res, 404, "Packaging provider not found.");
  }
  async createRequirement(req: Request, res: Response) {
    const who = await actor(req); if (!who?.companyId || role(req) !== "associate") return bad(res, 403, "Approved seeker company required.");
    if (!req.body?.title || !valid(req.body?.commodityId) || !(Number(req.body?.quantity) > 0)) return bad(res, 400, "Title, commodity, and quantity are required.");
    if (req.body?.enquiryId || req.body?.executionTaskId) {
      if (!valid(req.body?.enquiryId) || !valid(req.body?.executionTaskId)) return bad(res, 400, "Both a valid enquiry and packaging execution task are required.");
      const linked = await InquiryModel.exists({ _id: req.body.enquiryId, buyerAssociateId: who.id, executionInquiries: { $elemMatch: { _id: req.body.executionTaskId, type: "PACKAGING" } } });
      if (!linked) return bad(res, 403, "The linked packaging task does not belong to this buyer.");
    }
    const row = await ServiceRequirementModel.create({ ...req.body, department: DEPARTMENT, requester: who.id, requesterCompany: who.companyId, status: "DRAFT" }); return res.status(201).json({ success: true, data: row });
  }
  async updateRequirement(req: Request, res: Response) {
    const who = await actor(req); const row: any = await ServiceRequirementModel.findOne({ _id: req.params.id, department: DEPARTMENT });
    if (!row || !await canManageCompany(req, row.requesterCompany, who?.companyId)) return bad(res, 404, "Requirement not found.");
    if (row.status !== "DRAFT") return bad(res, 409, "Only draft requirements can be changed.");
    const protectedFields = ["department", "requester", "requesterCompany", "status", "winningOffer", "workOrder"];
    const changes = { ...req.body }; protectedFields.forEach((field) => delete changes[field]); Object.assign(row, changes); await row.save();
    return res.json({ success: true, data: row });
  }
  async publishRequirement(req: Request, res: Response) {
    const who = await actor(req); const row: any = await ServiceRequirementModel.findOne({ _id: req.params.id, department: DEPARTMENT }); if (!row) return bad(res, 404, "Requirement not found.");
    if (!await canManageCompany(req, row.requesterCompany, who?.companyId) || row.status !== "DRAFT") return bad(res, 409, "Only the owning company can schedule a draft.");
    const open = new Date(req.body?.opensAt), close = new Date(req.body?.closesAt); if (Number.isNaN(+open) || Number.isNaN(+close) || close <= open || close <= new Date()) return bad(res, 400, "A valid bidding window is required.");
    row.opensAt = open; row.closesAt = close; row.status = open <= new Date() ? "OPEN" : "SCHEDULED"; await row.save(); return res.json({ success: true, data: row });
  }
  async listRequirements(req: Request, res: Response) {
    await synchronizeServiceRequirements(DEPARTMENT); const who = await actor(req); if (!who && !staff(req)) return bad(res, 403, "Access required."); const mode = String(req.query.mode || "seeking"); const filter: any = { department: DEPARTMENT };
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();
    if (role(req) === "associate") mode === "seeking" ? filter.requesterCompany = who!.companyId : Object.assign(filter, { requesterCompany: { $ne: who!.companyId }, status: filter.status || { $in: ["OPEN", "CLOSED", "AWARDED"] } });
    else if (["operator", "team"].includes(role(req))) filter.requesterCompany = { $in: await scopedCompanies(req) };
    let requirements: any[] = await ServiceRequirementModel.find(filter).populate("commodityId serviceIds formatIds materialIds", "name kind").sort({ createdAt: -1 }).limit(200).lean();
    if (mode === "providing" && role(req) === "associate") { const profile: any = await ServiceProviderProfileModel.findOne({ department: DEPARTMENT, companyId: who!.companyId, status: "PUBLISHED" }).lean(); requirements = requirements.filter((r) => profileMatchesRequirement(profile, r)); }
    const offers: any[] = await ServiceOfferModel.find({ requirement: { $in: requirements.map((r) => r._id) } }).populate("providerCompany", "name").populate("proposedMaterialId proposedFormatId", "name").lean();
    return res.json({ success: true, data: requirements.map((r) => redactServiceRequirement(r, offers.filter((o) => id(o.requirement) === id(r)), { companyId: who?.companyId, owner: id(r.requesterCompany) === who?.companyId, provider: mode === "providing", staff: staff(req) })) });
  }
  async submitOffer(req: Request, res: Response) {
    const who = await actor(req); if (!who?.companyId || role(req) !== "associate") return bad(res, 403, "Approved provider company required."); const requirement: any = await ServiceRequirementModel.findById(req.params.id); if (!requirement) return bad(res, 404, "Requirement not found.");
    requirement.status = resolveServiceRequirementStatus(requirement.status, requirement.opensAt, requirement.closesAt); if (requirement.isModified("status")) await requirement.save(); if (requirement.status !== "OPEN" || id(requirement.requesterCompany) === who.companyId) return bad(res, 409, "This requirement is not available for your company.");
    const profile: any = await ServiceProviderProfileModel.findOne({ department: DEPARTMENT, companyId: who.companyId, status: "PUBLISHED" }).lean(); if (!profile) return bad(res, 403, "Publish your Packaging profile before bidding.");
    if (!profileMatchesRequirement(profile, requirement)) return bad(res, 403, "Your published packaging capabilities do not match this requirement.");
    const price = Number(req.body?.price), capacityCommitted = Number(req.body?.capacityCommitted), turnaroundDays = Number(req.body?.turnaroundDays); if (!(price > 0) || !(capacityCommitted > 0) || !(turnaroundDays >= 0) || !String(req.body?.pricingBasis || "").trim()) return bad(res, 400, "Price, pricing basis, capacity, and turnaround are required.");
    const existing: any = await ServiceOfferModel.findOne({ requirement: requirement._id, providerCompany: who.companyId }); const next = { ...req.body, price, capacityCommitted, turnaroundDays, provider: who.id, providerCompany: who.companyId, status: "SUBMITTED" };
    let offer: any; if (existing) { existing.revisions.push({ price: existing.price, pricingBasis: existing.pricingBasis, capacityCommitted: existing.capacityCommitted, turnaroundDays: existing.turnaroundDays, validUntil: existing.validUntil, proposedMaterialId: existing.proposedMaterialId, proposedFormatId: existing.proposedFormatId, note: existing.note, attachmentUrls: existing.attachmentUrls, at: new Date(), by: who.id }); Object.assign(existing, next); offer = await existing.save(); } else offer = await ServiceOfferModel.create({ ...next, requirement: requirement._id });
    await notify([requirement.requester], requirement, existing ? "SERVICE_OFFER_UPDATED" : "SERVICE_OFFER_SUBMITTED", "Sealed packaging offer received", `A provider ${existing ? "updated" : "submitted"} a confidential offer for ${requirement.title}.`, who.id); return res.status(existing ? 200 : 201).json({ success: true, data: offer });
  }
  async withdrawOffer(req: Request, res: Response) {
    const who = await actor(req); const requirement: any = await ServiceRequirementModel.findById(req.params.id); if (!requirement) return bad(res, 404, "Requirement not found."); requirement.status = resolveServiceRequirementStatus(requirement.status, requirement.opensAt, requirement.closesAt); if (requirement.status !== "OPEN") return bad(res, 409, "Offers can only be withdrawn while open.");
    const offer: any = await ServiceOfferModel.findOne({ requirement: requirement._id, providerCompany: who?.companyId }); if (!offer) return bad(res, 404, "Offer not found."); offer.status = "WITHDRAWN"; await offer.save(); await notify([requirement.requester], requirement, "SERVICE_OFFER_WITHDRAWN", "Packaging offer withdrawn", `A provider withdrew its sealed offer for ${requirement.title}.`, who?.id); return res.json({ success: true, data: offer });
  }
  async closeRequirement(req: Request, res: Response) {
    const who = await actor(req); const row: any = await ServiceRequirementModel.findById(req.params.id); if (!row || !await canManageCompany(req, row.requesterCompany, who?.companyId)) return bad(res, 404, "Requirement not found."); if (row.status === "CLOSED") return res.json({ success: true, data: row }); if (row.status !== "OPEN") return bad(res, 409, "Only an open requirement can be closed."); row.status = "CLOSED"; row.closesAt = new Date(); await row.save(); const participants = await ServiceOfferModel.find({ requirement: row._id, status: "SUBMITTED" }).distinct("provider"); await notify(participants, row, "SERVICE_REQUIREMENT_CLOSED", "Packaging bidding closed", `Sealed bidding has closed for ${row.title}.`, who?.id); return res.json({ success: true, data: row });
  }
  async cancelRequirement(req: Request, res: Response) {
    const who = await actor(req); const row: any = await ServiceRequirementModel.findById(req.params.id); if (!row || !await canManageCompany(req, row.requesterCompany, who?.companyId)) return bad(res, 404, "Requirement not found."); if (["AWARDED", "CANCELLED"].includes(row.status)) return bad(res, 409, "Requirement cannot be cancelled."); row.status = "CANCELLED"; row.cancellationReason = String(req.body?.reason || ""); await row.save(); const participants = await ServiceOfferModel.find({ requirement: row._id }).distinct("provider"); await notify(participants, row, "SERVICE_REQUIREMENT_CANCELLED", "Packaging requirement cancelled", `${row.title} was cancelled by the seeker.`, who?.id); return res.json({ success: true, data: row });
  }
  async award(req: Request, res: Response) {
    const who = await actor(req); const requirement: any = await ServiceRequirementModel.findById(req.params.id); if (!requirement || !await canManageCompany(req, requirement.requesterCompany, who?.companyId)) return bad(res, 404, "Requirement not found.");
    requirement.status = resolveServiceRequirementStatus(requirement.status, requirement.opensAt, requirement.closesAt); if (requirement.status === "AWARDED") return res.json({ success: true, data: requirement }); if (requirement.status !== "CLOSED") return bad(res, 409, "Close bidding before selecting a provider.");
    const offer: any = await ServiceOfferModel.findOne({ _id: req.body?.offerId, requirement: requirement._id, status: "SUBMITTED" }); if (!offer) return bad(res, 400, "Select a valid submitted offer.");
    const work: any = await ServiceWorkOrderModel.create({ department: DEPARTMENT, requirement: requirement._id, offer: offer._id, requester: requirement.requester, requesterCompany: requirement.requesterCompany, provider: offer.provider, providerCompany: offer.providerCompany, agreedPrice: offer.price, pricingBasis: offer.pricingBasis, snapshot: requirement.toObject(), enquiryId: requirement.enquiryId, orderId: requirement.orderId, executionTaskId: requirement.executionTaskId, status: "AWARDED", statusHistory: [{ status: "AWARDED", at: new Date(), by: req.user?.id, note: "Provider selected" }] });
    await ServiceOfferModel.updateMany({ requirement: requirement._id, status: { $ne: "WITHDRAWN" } }, [{ $set: { status: { $cond: [{ $eq: ["$_id", offer._id] }, "AWARDED", "NOT_SELECTED"] } } }]); requirement.status = "AWARDED"; requirement.winningOffer = offer._id; requirement.workOrder = work._id; await requirement.save();
    if (requirement.enquiryId && requirement.executionTaskId) await InquiryModel.updateOne({ _id: requirement.enquiryId, "executionInquiries._id": requirement.executionTaskId }, { $set: { "executionInquiries.$.committedProvider": offer.providerCompany, "executionInquiries.$.bidAmount": offer.price, "executionInquiries.$.status": "IN_PROGRESS", "executionInquiries.$.committedAt": new Date() } });
    const notSelected = await ServiceOfferModel.find({ requirement: requirement._id, status: "NOT_SELECTED" }).distinct("provider"); await Promise.all([notify([offer.provider], requirement, "SERVICE_REQUIREMENT_AWARDED", "Packaging work awarded", `Your company was selected for ${requirement.title}.`, who?.id), notify(notSelected, requirement, "SERVICE_OFFER_NOT_SELECTED", "Packaging award completed", `Another provider was selected for ${requirement.title}.`, who?.id)]); return res.json({ success: true, data: requirement });
  }
  async listWork(req: Request, res: Response) {
    const who = await actor(req); const filter: any = { department: DEPARTMENT }; const state = String(req.query.state || "active"); if (state === "history") filter.status = { $in: ["COMPLETED", "CANCELLED"] }; else filter.status = { $nin: ["COMPLETED", "CANCELLED"] };
    if (role(req) === "associate") filter.$or = [{ requesterCompany: who?.companyId }, { providerCompany: who?.companyId }]; else if (["operator", "team"].includes(role(req))) { const scope = await scopedCompanies(req); filter.$or = [{ requesterCompany: { $in: scope } }, { providerCompany: { $in: scope } }]; } else if (role(req) !== "admin") return bad(res, 403, "Access required.");
    const rows = await ServiceWorkOrderModel.find(filter).populate("requesterCompany providerCompany", "name").populate("requirement", "title quantity unit requiredBy").sort({ updatedAt: -1 }).lean(); return res.json({ success: true, data: rows });
  }
  async workDetail(req: Request, res: Response) {
    const who = await actor(req); const row: any = await ServiceWorkOrderModel.findOne({ _id: req.params.id, department: DEPARTMENT }).populate("requesterCompany providerCompany", "name").populate("requirement", "title quantity unit requiredBy").lean();
    if (!row) return bad(res, 404, "Work order not found."); const companies = [id(row.requesterCompany), id(row.providerCompany)];
    if (!staff(req) && !companies.includes(who?.companyId || "")) return bad(res, 403, "Forbidden.");
    if (["operator", "team"].includes(role(req)) && !await Promise.all(companies.map((companyId) => canManageCompany(req, companyId))).then((values) => values.some(Boolean))) return bad(res, 403, "Forbidden.");
    return res.json({ success: true, data: row });
  }
  async transitionWork(req: Request, res: Response) {
    const who = await actor(req); const row: any = await ServiceWorkOrderModel.findById(req.params.id); if (!row) return bad(res, 404, "Work order not found."); const next = String(req.body?.status || "").toUpperCase(); const order = [...SERVICE_WORK_STATUSES]; const currentIndex = order.indexOf(row.status), nextIndex = order.indexOf(next as any);
    const ownsProvider = id(row.providerCompany) === who?.companyId, ownsRequester = id(row.requesterCompany) === who?.companyId; if (!staff(req) && !ownsProvider && !ownsRequester) return bad(res, 403, "Forbidden.");
    const allowed = next === "CANCELLED" ? (staff(req) || ownsRequester) && row.status !== "COMPLETED" : next === "COMPLETED" ? (staff(req) || ownsRequester) && row.status === "READY_FOR_DISPATCH" : (staff(req) || ownsProvider) && nextIndex === currentIndex + 1;
    if (!allowed) return bad(res, 409, `Cannot move packaging work from ${row.status} to ${next}.`); row.status = next; row.progressNote = String(req.body?.note || row.progressNote || ""); row.exceptionNote = String(req.body?.exceptionNote || row.exceptionNote || ""); row.statusHistory.push({ status: next, at: new Date(), by: req.user?.id, note: req.body?.note || "" }); await row.save();
    await notify([ownsProvider ? row.requester : row.provider], row, "SERVICE_WORK_UPDATED", "Packaging work updated", `Packaging work moved to ${next.replace(/_/g, " ")}.`, who?.id); return res.json({ success: true, data: row });
  }
  async addDocument(req: Request, res: Response) {
    const who = await actor(req); const row: any = await ServiceWorkOrderModel.findById(req.params.id); if (!row) return bad(res, 404, "Work order not found."); if (!staff(req) && ![id(row.requesterCompany), id(row.providerCompany)].includes(who?.companyId || "")) return bad(res, 403, "Forbidden.");
    if (!req.body?.url || !req.body?.name) return bad(res, 400, "Document name and URL are required."); row.documents.push({ kind: req.body?.kind || "OTHER", name: req.body.name, url: req.body.url, uploadedBy: req.user?.id, uploadedAt: new Date() }); await row.save(); return res.status(201).json({ success: true, data: row });
  }
}
export const serviceMarketplaceController = new ServiceMarketplaceController();
