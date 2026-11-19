import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AGRITECH_WORKFLOW_STAGES, AgritechProfileModel } from "../database/models/agritechProfile";

const role = (req: Request) => String(req.user?.role || "").toLowerCase();
const admin = (req: Request) => role(req) === "admin";
const bad = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });
const validUrl = (value: unknown) => { try { const url = new URL(String(value || "")); return ["http:", "https:"].includes(url.protocol); } catch { return false; } };
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function companyId(req: Request) {
  if (admin(req)) {
    const requested = String(req.query.companyId || req.body?.companyId || "");
    return Types.ObjectId.isValid(requested) ? requested : null;
  }
  if (role(req) !== "associate" || !Types.ObjectId.isValid(String(req.user?.id || ""))) return null;
  const associate: any = await AssociateModel.findById(req.user!.id).select("associateCompany").lean();
  if (!associate?.associateCompany) return null;
  const company: any = await AssociateCompanyModel.findOne({ _id: associate.associateCompany, registrationStatus: "APPROVED", isDeleted: { $ne: true } }).select("_id").lean();
  return company ? String(company._id) : null;
}

export function normalizeAgritechSnapshot(raw: any) {
  const snapshot = { ...raw, workflowStages: Array.from(new Set((raw?.workflowStages || []).map((x: unknown) => String(x).toUpperCase()))), coverageStates: Array.from(new Set((raw?.coverageStates || []).map((x: unknown) => String(x).trim()).filter(Boolean))) };
  const latitude = Number(snapshot?.headquarters?.latitude), longitude = Number(snapshot?.headquarters?.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) snapshot.headquarters = { ...snapshot.headquarters, latitude, longitude, point: { type: "Point", coordinates: [longitude, latitude] } };
  if (snapshot.coverageMode === "ALL_INDIA") snapshot.coverageStates = [];
  if (!snapshot.hasApi) { snapshot.apiDocumentationUrl = ""; snapshot.apiSummary = ""; }
  return snapshot;
}

export function validateAgritechSnapshot(snapshot: any) {
  const errors: string[] = [];
  ["displayName", "website", "shortDescription", "companyDescription", "contactEmail", "contactPhone"].forEach((key) => { if (!String(snapshot?.[key] || "").trim()) errors.push(`${key} is required`); });
  if (!validUrl(snapshot?.website)) errors.push("website must be a valid HTTP or HTTPS URL");
  if (!Array.isArray(snapshot?.workflowStages) || !snapshot.workflowStages.length) errors.push("Select at least one workflow problem");
  if ((snapshot?.workflowStages || []).some((stage: string) => !AGRITECH_WORKFLOW_STAGES.includes(stage as any))) errors.push("An unsupported workflow problem was selected");
  if (snapshot?.workflowStages?.includes("OTHER") && !String(snapshot?.otherProblem || "").trim()) errors.push("Describe the other problem being solved");
  if (typeof snapshot?.hasApi !== "boolean") errors.push("API availability is required");
  if (snapshot?.hasApi && snapshot.apiDocumentationUrl && !validUrl(snapshot.apiDocumentationUrl)) errors.push("API documentation link must be a valid HTTP or HTTPS URL");
  if (!["ALL_INDIA", "SELECTED_STATES"].includes(snapshot?.coverageMode)) errors.push("Operational coverage is required");
  if (snapshot?.coverageMode === "SELECTED_STATES" && !snapshot?.coverageStates?.length) errors.push("Select at least one operational state");
  const lat = Number(snapshot?.headquarters?.latitude), lng = Number(snapshot?.headquarters?.longitude);
  if (!String(snapshot?.headquarters?.address || "").trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) errors.push("A headquarters address and valid map coordinates are required");
  return errors;
}

export class AgritechProfileController {
  async mine(req: Request, res: Response) {
    const owner = await companyId(req); if (!owner) return bad(res, 403, "Approved associate company access required.");
    return res.json({ success: true, data: await AgritechProfileModel.findOne({ companyId: owner }).populate("companyId", "name").lean() });
  }
  async save(req: Request, res: Response) {
    const owner = await companyId(req); if (!owner) return bad(res, 403, "Approved associate company access required.");
    const current: any = await AgritechProfileModel.findOne({ companyId: owner });
    if (current?.status === "PENDING_REVIEW") return bad(res, 409, "Editing is locked while this profile is under review.");
    if (current && Number(req.body?.expectedRevision) !== current.revision) return res.status(409).json({ success: false, message: "This profile changed in another session. Reload before continuing.", error: { code: "AGRITECH_PROFILE_REVISION_CONFLICT", currentRevision: current.revision } });
    const draft = normalizeAgritechSnapshot(req.body?.snapshot || {});
    const row: any = current || new AgritechProfileModel({ companyId: owner });
    row.draft = draft; row.status = "DRAFT"; row.reviewNotes = ""; if (current) row.revision += 1;
    await row.save(); return res.json({ success: true, data: row });
  }
  async submit(req: Request, res: Response) {
    const owner = await companyId(req); if (!owner) return bad(res, 403, "Approved associate company access required.");
    const row: any = await AgritechProfileModel.findOne({ companyId: owner }); if (!row) return bad(res, 404, "Save the startup profile first.");
    if (row.status === "PENDING_REVIEW") return bad(res, 409, "This profile is already under review.");
    if (Number(req.body?.expectedRevision) !== row.revision) return bad(res, 409, "This profile changed in another session. Reload before continuing.");
    const errors = validateAgritechSnapshot(row.draft); if (errors.length) return res.status(400).json({ success: false, message: errors.join("; "), errors });
    row.status = "PENDING_REVIEW"; row.submittedAt = new Date(); row.revision += 1; row.statusHistory.push({ status: row.status, actorId: req.user?.id, note: "Submitted for admin review" }); await row.save();
    return res.json({ success: true, data: row });
  }
  async archive(req: Request, res: Response) {
    const owner = await companyId(req); if (!owner) return bad(res, 403, "Approved associate company access required.");
    const row: any = await AgritechProfileModel.findOne({ companyId: owner }); if (!row) return bad(res, 404, "Profile not found.");
    row.status = "ARCHIVED"; row.archivedAt = new Date(); row.revision += 1; row.statusHistory.push({ status: row.status, actorId: req.user?.id, note: "Profile archived" }); await row.save(); return res.json({ success: true, data: row });
  }
  async restore(req: Request, res: Response) {
    const owner = await companyId(req); if (!owner) return bad(res, 403, "Approved associate company access required.");
    const row: any = await AgritechProfileModel.findOne({ companyId: owner, status: "ARCHIVED" }); if (!row) return bad(res, 404, "Archived profile not found.");
    row.status = row.published ? "PUBLISHED" : "DRAFT"; row.archivedAt = null; row.revision += 1; row.statusHistory.push({ status: row.status, actorId: req.user?.id, note: "Profile restored" }); await row.save(); return res.json({ success: true, data: row });
  }
  async directory(req: Request, res: Response) {
    const query: any = { status: { $ne: "ARCHIVED" }, published: { $ne: null } }; const search = String(req.query.search || "").trim(); const conditions: any[] = [];
    if (search) conditions.push({ $or: ["displayName", "shortDescription", "companyDescription"].map((field) => ({ [`published.${field}`]: new RegExp(escaped(search), "i") })) });
    if (req.query.workflowStage) query["published.workflowStages"] = String(req.query.workflowStage).toUpperCase();
    if (req.query.hasApi === "true" || req.query.hasApi === "false") query["published.hasApi"] = req.query.hasApi === "true";
    if (req.query.state) conditions.push({ $or: [{ "published.coverageMode": "ALL_INDIA" }, { "published.coverageStates": String(req.query.state) }] });
    if (conditions.length) query.$and = conditions;
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 18));
    const [rows, total] = await Promise.all([AgritechProfileModel.find(query).select("published publishedAt").sort({ "published.displayName": 1 }).skip((page - 1) * limit).limit(limit).lean(), AgritechProfileModel.countDocuments(query)]);
    return res.json({ success: true, data: rows, markers: rows.map((row: any) => ({ profileId: row._id, displayName: row.published.displayName, ...row.published.headquarters })).filter((x: any) => Number.isFinite(x.latitude) && Number.isFinite(x.longitude)), meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  }
  async detail(req: Request, res: Response) {
    const row = await AgritechProfileModel.findOne({ _id: req.params.id, status: { $ne: "ARCHIVED" }, published: { $ne: null } }).select("published publishedAt").lean(); return row ? res.json({ success: true, data: row }) : bad(res, 404, "Agritech startup not found.");
  }
  async approvals(req: Request, res: Response) {
    if (!admin(req)) return bad(res, 403, "Admin access required.");
    const status = String(req.query.status || "").toUpperCase(); const query = status ? { status } : {};
    return res.json({ success: true, data: await AgritechProfileModel.find(query).populate("companyId", "name email").sort({ submittedAt: 1, updatedAt: -1 }).lean() });
  }
  async review(req: Request, res: Response) {
    if (!admin(req)) return bad(res, 403, "Admin access required.");
    const row: any = await AgritechProfileModel.findOne({ _id: req.params.id, status: "PENDING_REVIEW" }); if (!row) return bad(res, 409, "This agritech profile is no longer pending review. Refresh the approval queue.");
    const action = String(req.body?.action || "").toUpperCase(), notes = String(req.body?.notes ?? req.body?.reviewNotes ?? "").trim();
    if (action === "REJECT" && !notes) return bad(res, 400, "Rejection notes are required.");
    const now = new Date(); const update: any = { reviewNotes: notes, reviewedBy: req.user?.id, status: action === "APPROVE" ? "PUBLISHED" : "REJECTED" };
    if (action === "APPROVE") { const errors = validateAgritechSnapshot(row.draft); if (errors.length) return res.status(400).json({ success: false, code: "REVIEW_VALIDATION_FAILED", message: errors.join("; "), errors }); update.published = row.draft.toObject(); update.publishedAt = now; }
    else if (action !== "REJECT") return bad(res, 400, "Action must be APPROVE or REJECT.");
    const reviewed = await AgritechProfileModel.findOneAndUpdate({ _id: row._id, status: "PENDING_REVIEW" }, { $set: update, $inc: { revision: 1 }, $push: { statusHistory: { status: update.status, actorId: req.user?.id, note: notes || "Profile approved", at: now } } }, { new: true, runValidators: true }); if (!reviewed) return bad(res, 409, "This agritech profile was already reviewed. Refresh the approval queue."); return res.json({ success: true, data: reviewed });
  }
}
