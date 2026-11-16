import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { FINANCIAL_APPLICATION_STATUSES, FinancialApplicationModel, FinancialPartnerProfileModel } from "../database/models/financialPartner";

const id = (value: any) => String(value?._id || value || "");
const valid = (value: any) => Types.ObjectId.isValid(id(value));
const role = (req: Request) => String(req.user?.role || "").toLowerCase();
const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });
const actor = async (req: Request) => {
  const companyId = id(req.user?.associateCompany);
  if (role(req) !== "associate") return { userId: id(req.user?.id), companyId };
  const row: any = await AssociateModel.findById(req.user?.id).select("associateCompany registrationStatus isActive isDeleted").lean();
  if (!row || row.isDeleted || !row.isActive || row.registrationStatus !== "APPROVED") return null;
  return { userId: id(row), companyId: id(row.associateCompany) };
};
const canManage = async (req: Request, companyId: any, own?: string) => role(req) === "admin" || id(companyId) === own || Boolean(await AssociateCompanyModel.exists({ _id: companyId, assignedOperator: req.user?.id }));
const httpUrl = (value: any) => { try { return ["http:", "https:"].includes(new URL(String(value)).protocol); } catch { return false; } };
export const validateFinancialProfile = (snapshot: any) => {
  const errors: string[] = [];
  if (!String(snapshot?.displayName || "").trim()) errors.push("Display name is required");
  if (!String(snapshot?.contactEmail || "").trim()) errors.push("Contact email is required");
  if (!String(snapshot?.contactPhone || "").trim()) errors.push("Contact phone is required");
  if (!snapshot?.partnerTypes?.length) errors.push("At least one partner type is required");
  if (!snapshot?.locations?.length) errors.push("At least one operating location is required");
  if (!snapshot?.offerings?.length) errors.push("At least one offering is required");
  (snapshot?.offerings || []).forEach((offering: any, index: number) => {
    if (!String(offering.title || "").trim() || !offering.type) errors.push(`Offering ${index + 1} requires a title and type`);
    if (!offering.currencies?.length) errors.push(`Offering ${index + 1} requires a currency`);
    if (offering.maximumAmount != null && Number(offering.maximumAmount) < Number(offering.minimumAmount || 0)) errors.push(`Offering ${index + 1} maximum amount must be at least its minimum`);
  });
  return errors;
};
const publicProfile = (row: any) => {
  const item = row?.toObject ? row.toObject() : row;
  if (!item) return item;
  const published = item.published ? { ...item.published, credentials: (item.published.credentials || []).map(({ evidenceUrl, ...credential }: any) => credential) } : null;
  return { _id: item._id, companyId: item.companyId, status: item.status, published, publishedAt: item.publishedAt };
};

export class FinancialPartnerController {
  async getPortfolio(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.query.companyId || who?.companyId || "");
    if (!valid(companyId) || !await canManage(req, companyId, who?.companyId)) return fail(res, 403, "Company access required.");
    const row = await FinancialPartnerProfileModel.findOne({ companyId }).populate("companyId", "name providedCapabilities").lean();
    return res.json({ success: true, data: row || { companyId, status: "DRAFT", draft: null, published: null } });
  }
  async savePortfolio(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.body?.companyId || who?.companyId || "");
    if (!who || !valid(companyId) || !await canManage(req, companyId, who.companyId)) return fail(res, 403, "Approved company access required.");
    const company: any = await AssociateCompanyModel.findById(companyId).select("providedCapabilities registrationStatus isApproved").lean();
    if (role(req) !== "admin" && (!company || company.registrationStatus !== "APPROVED" || !(company.providedCapabilities || []).includes("finance-risk"))) return fail(res, 403, "An approved company providing Finance & Insurance is required.");
    const existing: any = await FinancialPartnerProfileModel.findOne({ companyId });
    if (existing?.status === "PENDING_REVIEW" || existing?.status === "ARCHIVED") return fail(res, 409, "This portfolio cannot be edited in its current state.");
    const row = await FinancialPartnerProfileModel.findOneAndUpdate({ companyId }, { $set: { draft: req.body.snapshot, status: existing?.published ? "PUBLISHED" : "DRAFT", reviewNotes: "" }, $push: { statusHistory: { status: existing?.published ? "PUBLISHED" : "DRAFT", actorId: req.user?.id, note: "Portfolio draft saved" } } }, { upsert: true, new: true, runValidators: true });
    return res.json({ success: true, data: row });
  }
  async submitPortfolio(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.body?.companyId || who?.companyId || "");
    if (!who || !valid(companyId) || !await canManage(req, companyId, who.companyId)) return fail(res, 403, "Company access required.");
    const row: any = await FinancialPartnerProfileModel.findOne({ companyId }); if (!row) return fail(res, 404, "Save the portfolio first.");
    const errors = validateFinancialProfile(row.draft); if (errors.length) return res.status(400).json({ success: false, message: errors.join("; "), errors });
    row.status = "PENDING_REVIEW"; row.submittedAt = new Date(); row.statusHistory.push({ status: row.status, actorId: req.user?.id, note: "Submitted for review" }); await row.save();
    return res.json({ success: true, data: row });
  }
  async approvals(req: Request, res: Response) {
    if (role(req) !== "admin") return fail(res, 403, "Admin access required.");
    return res.json({ success: true, data: await FinancialPartnerProfileModel.find({ status: { $in: ["PENDING_REVIEW", "REJECTED"] } }).populate("companyId", "name").sort({ submittedAt: 1 }).lean() });
  }
  async review(req: Request, res: Response) {
    if (role(req) !== "admin") return fail(res, 403, "Admin access required."); const row: any = await FinancialPartnerProfileModel.findById(req.params.id); if (!row) return fail(res, 404, "Portfolio not found.");
    const action = String(req.body?.action || "").toUpperCase();
    if (action === "APPROVE") { const errors = validateFinancialProfile(row.draft); if (errors.length) return fail(res, 400, errors.join("; ")); row.published = row.draft.toObject(); row.published.offerings.forEach((offering: any) => { if (offering.status === "DRAFT") offering.status = "PUBLISHED"; }); row.status = "PUBLISHED"; row.publishedAt = new Date(); }
    else if (action === "REJECT") row.status = "REJECTED"; else return fail(res, 400, "Action must be APPROVE or REJECT.");
    row.reviewNotes = String(req.body?.reviewNotes || ""); row.reviewedBy = req.user?.id; row.statusHistory.push({ status: row.status, actorId: req.user?.id, note: row.reviewNotes }); await row.save();
    return res.json({ success: true, data: row });
  }
  async directory(req: Request, res: Response) {
    const query: any = { status: "PUBLISHED", published: { $ne: null } };
    if (req.query.partnerType) query["published.partnerTypes"] = String(req.query.partnerType).toUpperCase();
    if (req.query.offeringType) query["published.offerings"] = { $elemMatch: { type: String(req.query.offeringType).toUpperCase(), status: "PUBLISHED" } };
    if (req.query.currency) query["published.offerings.currencies"] = String(req.query.currency).toUpperCase();
    const search = String(req.query.search || "").trim(); if (search) query.$or = ["published.displayName", "published.summary", "published.industries", "published.commodities", "published.serviceRegions"].map((field) => ({ [field]: { $regex: search, $options: "i" } }));
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
    const [rows, total] = await Promise.all([FinancialPartnerProfileModel.find(query).populate("companyId", "name logo").sort({ "published.displayName": 1 }).skip((page - 1) * limit).limit(limit).lean(), FinancialPartnerProfileModel.countDocuments(query)]);
    return res.json({ success: true, data: rows.map(publicProfile), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }
  async detail(req: Request, res: Response) { const row = await FinancialPartnerProfileModel.findOne({ _id: req.params.id, status: "PUBLISHED" }).populate("companyId", "name logo").lean(); return row ? res.json({ success: true, data: publicProfile(row) }) : fail(res, 404, "Financial partner not found."); }
  async createApplication(req: Request, res: Response) {
    const who = await actor(req); if (!who?.companyId) return fail(res, 403, "An approved applicant company is required.");
    const profile: any = await FinancialPartnerProfileModel.findOne({ _id: req.params.id, status: "PUBLISHED" }).lean(); if (!profile) return fail(res, 404, "Financial partner not found.");
    if (id(profile.companyId) === who.companyId) return fail(res, 400, "A company cannot apply to its own portfolio.");
    const offering = (profile.published?.offerings || []).find((item: any) => id(item) === id(req.body?.offeringId) && item.status === "PUBLISHED"); if (!offering) return fail(res, 400, "Select a published offering.");
    if (!(Number(req.body?.requestedAmount) > 0) || !String(req.body?.currency || "").trim() || !String(req.body?.purpose || "").trim() || req.body?.consent !== true) return fail(res, 400, "Amount, currency, purpose, and consent are required.");
    const documents = Array.isArray(req.body.documents) ? req.body.documents : []; if (documents.some((doc: any) => !doc.name || !httpUrl(doc.url))) return fail(res, 400, "Documents require a name and valid HTTP or HTTPS URL.");
    const duplicate = await FinancialApplicationModel.exists({ applicantCompanyId: who.companyId, profileId: profile._id, offeringId: offering._id, status: { $nin: ["DECLINED", "WITHDRAWN", "CLOSED"] } });
    if (duplicate) return fail(res, 409, "An active application already exists for this offering.");
    const row = await FinancialApplicationModel.create({ profileId: profile._id, offeringId: offering._id, applicantCompanyId: who.companyId, partnerCompanyId: profile.companyId, createdBy: who.userId, requestedAmount: req.body.requestedAmount, currency: req.body.currency, purpose: req.body.purpose, tradeReference: req.body.tradeReference, preferredBy: req.body.preferredBy || null, notes: req.body.notes, documents, consent: true, activity: [{ action: "SUBMITTED", actorId: who.userId }] });
    return res.status(201).json({ success: true, data: row });
  }
  async applications(req: Request, res: Response) {
    const who = await actor(req); if (!who?.companyId && role(req) !== "admin") return fail(res, 403, "Company access required.");
    const box = String(req.query.box || "submitted"); const query: any = role(req) === "admin" ? {} : box === "received" ? { partnerCompanyId: who!.companyId } : { applicantCompanyId: who!.companyId };
    const rows = await FinancialApplicationModel.find(query).populate("applicantCompanyId", "name").populate("partnerCompanyId", "name").populate("profileId", "published.displayName published.offerings").sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, data: rows });
  }
  async transition(req: Request, res: Response) {
    const who = await actor(req); const row: any = await FinancialApplicationModel.findById(req.params.id); if (!row || (!await canManage(req, row.partnerCompanyId, who?.companyId) && id(row.applicantCompanyId) !== who?.companyId)) return fail(res, row ? 403 : 404, row ? "Not allowed." : "Application not found.");
    const next = String(req.body?.status || "").toUpperCase(); if (!(FINANCIAL_APPLICATION_STATUSES as readonly string[]).includes(next)) return fail(res, 400, "Invalid application status.");
    const applicant = id(row.applicantCompanyId) === who?.companyId && role(req) !== "admin";
    const partnerTransitions: Record<string, string[]> = { SUBMITTED: ["UNDER_REVIEW", "DECLINED"], UNDER_REVIEW: ["MORE_INFORMATION_REQUIRED", "ELIGIBLE", "DECLINED"], MORE_INFORMATION_REQUIRED: ["UNDER_REVIEW", "DECLINED"], ELIGIBLE: ["TERMS_OFFERED", "DECLINED", "CLOSED"], TERMS_OFFERED: ["ACCEPTED", "DECLINED", "CLOSED"], ACCEPTED: ["CLOSED"], DECLINED: ["CLOSED"] };
    const allowed = applicant ? (["SUBMITTED", "UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "ELIGIBLE", "TERMS_OFFERED"].includes(row.status) ? ["WITHDRAWN"] : []) : (partnerTransitions[row.status] || []);
    if (!allowed.includes(next)) return fail(res, 403, "This status transition is not allowed.");
    row.status = next; if (req.body.partnerNote !== undefined) row.partnerNote = req.body.partnerNote; if (req.body.informationRequest !== undefined) row.informationRequest = req.body.informationRequest;
    row.activity.push({ action: next, actorId: who?.userId || req.user?.id, note: req.body.note || req.body.informationRequest || "" }); await row.save(); return res.json({ success: true, data: row });
  }
}
export const financialPartnerController = new FinancialPartnerController();
