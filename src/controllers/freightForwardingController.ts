import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CustomsCaseModel, FreightFinanceModel, FreightOfferModel, FreightProviderProfileModel, FreightRequirementModel, FreightShipmentModel } from "../database/models/freightForwarding";
import { FREIGHT_MODES } from "../interfaces/freightForwarding";

const id = (value: any) => String(value?._id || value || "");
const valid = (value: any) => Types.ObjectId.isValid(id(value));
const role = (req: Request) => String(req.user?.role || "").toLowerCase();
const staff = (req: Request) => ["admin", "operator", "team"].includes(role(req));
const fail = (res: Response, status: number, message: string, errors?: string[]) => res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
const actor = async (req: Request) => {
  if (role(req) !== "associate") return { id: id(req.user?.id), companyId: id(req.user?.associateCompany) };
  const row: any = await AssociateModel.findById(req.user?.id).select("associateCompany registrationStatus isActive isDeleted").lean();
  if (!row || row.isDeleted || !row.isActive || row.registrationStatus !== "APPROVED") return null;
  return { id: id(row._id), companyId: id(row.associateCompany) };
};
const managed = async (req: Request, companyId: any, own?: string) => role(req) === "admin" || id(companyId) === own || Boolean(await AssociateCompanyModel.exists({ _id: companyId, assignedOperator: req.user?.id }));
const scoped = async (req: Request) => role(req) === "admin" ? null : ["operator", "team"].includes(role(req)) ? await AssociateCompanyModel.find({ assignedOperator: req.user?.id }).distinct("_id") : [];
const shipmentRef = () => `FRT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
const milestoneTemplates: Record<string, string[]> = {
  OCEAN: ["BOOKING_CONFIRMED", "CARGO_PICKED_UP", "GATE_IN", "DEPARTED", "TRANSSHIPMENT", "ARRIVED", "CUSTOMS_RELEASED", "DELIVERED", "POD_RECEIVED"],
  AIR: ["BOOKING_CONFIRMED", "CARGO_PICKED_UP", "ACCEPTED_BY_AIRLINE", "DEPARTED", "ARRIVED", "CUSTOMS_RELEASED", "DELIVERED", "POD_RECEIVED"],
  ROAD: ["VEHICLE_ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVED", "DELIVERED", "POD_RECEIVED"],
  RAIL: ["WAGON_BOOKED", "CARGO_ACCEPTED", "DEPARTED", "ARRIVED", "RELEASED", "DELIVERED"],
  MULTIMODAL: ["BOOKING_CONFIRMED", "PICKED_UP", "FIRST_LEG_DEPARTED", "TRANSFERRED", "FINAL_LEG_ARRIVED", "CUSTOMS_RELEASED", "DELIVERED", "POD_RECEIVED"],
};
const defaultMilestones = (modes: string[]) => Array.from(new Set((modes || []).flatMap((mode) => milestoneTemplates[mode] || []))).map((code) => ({ code, label: code.replace(/_/g, " "), status: "PENDING" }));
const profileErrors = (snapshot: any) => {
  const errors: string[] = [];
  if (!String(snapshot?.displayName || "").trim()) errors.push("Display name is required");
  if (!String(snapshot?.contactEmail || "").trim()) errors.push("Contact email is required");
  if (!snapshot?.modes?.length) errors.push("At least one transport mode is required");
  if (!snapshot?.lanes?.length) errors.push("At least one service lane is required");
  return errors;
};
const canSeeShipment = async (req: Request, shipment: any, who: any) => Boolean(shipment && (staff(req) ? await managed(req, shipment.ownerCompany, who?.companyId) : id(shipment.ownerCompany) === who?.companyId || id(shipment.customerCompany) === who?.companyId));

export class FreightForwardingController {
  async taxonomy(_req: Request, res: Response) {
    return res.json({ success: true, data: { modes: FREIGHT_MODES, movementTypes: ["FCL", "LCL", "BREAK_BULK", "BULK", "ULD", "PARCEL", "FTL", "LTL", "WAGON", "CONSOLIDATED"], equipmentTypes: ["20GP", "40GP", "40HC", "REEFER", "OPEN_TOP", "FLAT_RACK", "TANK", "ULD", "TRUCK", "TRAILER", "WAGON"], services: ["DOOR_TO_DOOR", "PORT_TO_PORT", "CONSOLIDATION", "DECONSOLIDATION", "CUSTOMS_BROKERAGE", "INSURANCE", "WAREHOUSING", "LAST_MILE"], incoterms: ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"] } });
  }
  async getProfile(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.query.companyId || who?.companyId || "");
    if (!valid(companyId) || !await managed(req, companyId, who?.companyId)) return fail(res, 403, "Company access required.");
    const row = await FreightProviderProfileModel.findOne({ companyId }).populate("companyId", "name").lean();
    return res.json({ success: true, data: row || { companyId, status: "DRAFT", draft: null } });
  }
  async saveProfile(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.body?.companyId || who?.companyId || "");
    if (!valid(companyId) || !await managed(req, companyId, who?.companyId)) return fail(res, 403, "Company access required.");
    const current: any = await FreightProviderProfileModel.findOne({ companyId });
    const revisions = current?.draft ? [...(current.revisions || []), { snapshot: current.draft, by: req.user?.id }] : current?.revisions || [];
    const row = await FreightProviderProfileModel.findOneAndUpdate({ companyId }, { $set: { draft: req.body.snapshot, status: "DRAFT", reviewNotes: "", revisions } }, { upsert: true, new: true, runValidators: true });
    return res.json({ success: true, data: row });
  }
  async submitProfile(req: Request, res: Response) {
    const who = await actor(req); const companyId = String(req.body?.companyId || who?.companyId || "");
    if (!valid(companyId) || !await managed(req, companyId, who?.companyId)) return fail(res, 403, "Company access required.");
    const row: any = await FreightProviderProfileModel.findOne({ companyId }); if (!row) return fail(res, 404, "Save a profile first.");
    const errors = profileErrors(row.draft); if (errors.length) return fail(res, 400, errors.join("; "), errors);
    row.status = "PENDING_REVIEW"; row.submittedAt = new Date(); await row.save(); return res.json({ success: true, data: row });
  }
  async approvals(req: Request, res: Response) {
    if (!staff(req)) return fail(res, 403, "Staff access required."); const filter: any = { status: { $in: ["PENDING_REVIEW", "REJECTED"] } }; const scope = await scoped(req); if (scope) filter.companyId = { $in: scope };
    return res.json({ success: true, data: await FreightProviderProfileModel.find(filter).populate("companyId", "name").sort({ submittedAt: 1 }).lean() });
  }
  async reviewProfile(req: Request, res: Response) {
    if (role(req) !== "admin") return fail(res, 403, "Admin access required."); const row: any = await FreightProviderProfileModel.findById(req.params.id); if (!row) return fail(res, 404, "Profile not found.");
    const action = String(req.body.action || "").toUpperCase(); if (action === "APPROVE") { const errors = profileErrors(row.draft); if (errors.length) return fail(res, 400, errors.join("; ")); row.published = row.draft; row.status = "PUBLISHED"; row.publishedAt = new Date(); } else if (action === "REJECT") row.status = "REJECTED"; else return fail(res, 400, "Action must be APPROVE or REJECT.");
    row.reviewNotes = String(req.body.notes || ""); row.reviewedBy = req.user?.id; await row.save(); return res.json({ success: true, data: row });
  }
  async directory(req: Request, res: Response) {
    const filter: any = { status: "PUBLISHED", published: { $ne: null } }; const search = String(req.query.search || "").trim(); if (search) filter["published.displayName"] = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); if (req.query.mode) filter["published.modes"] = String(req.query.mode).toUpperCase();
    return res.json({ success: true, data: await FreightProviderProfileModel.find(filter).populate("companyId", "name").sort({ "published.displayName": 1 }).limit(200).lean() });
  }
  async requirements(req: Request, res: Response) {
    const who = await actor(req); if (!who && !staff(req)) return fail(res, 403, "Access required."); const mode = String(req.query.mode || "seeking"); const filter: any = { archivedAt: null };
    if (role(req) === "associate") mode === "seeking" ? filter.requesterCompany = who!.companyId : Object.assign(filter, { requesterCompany: { $ne: who!.companyId }, status: { $in: ["OPEN", "CLOSED", "AWARDED"] } }); else { const scope = await scoped(req); if (scope) filter.requesterCompany = { $in: scope }; }
    const rows: any[] = await FreightRequirementModel.find(filter).populate("requesterCompany", "name").sort({ createdAt: -1 }).lean(); const offerRows: any[] = await FreightOfferModel.find({ requirement: { $in: rows.map((x) => x._id) } }).populate("providerCompany", "name").lean();
    return res.json({ success: true, data: rows.map((row) => { const offers = offerRows.filter((offer) => id(offer.requirement) === id(row._id)); const owner = id(row.requesterCompany) === who?.companyId || id(row.requesterCompany?._id) === who?.companyId; return { ...row, offerCount: offers.filter((x) => x.status !== "WITHDRAWN").length, offers: owner && ["CLOSED", "AWARDED"].includes(row.status) ? offers : undefined, ownOffer: mode === "providing" ? offers.find((x) => id(x.providerCompany) === who?.companyId || id(x.providerCompany?._id) === who?.companyId) : undefined }; }) });
  }
  async createRequirement(req: Request, res: Response) {
    const who = await actor(req); if (!who?.companyId || role(req) !== "associate") return fail(res, 403, "Approved associate access required."); if (!req.body.title || !(req.body.modes || []).length || !req.body.origin || !req.body.destination) return fail(res, 400, "Title, mode, origin, and destination are required.");
    const row = await FreightRequirementModel.create({ ...req.body, requester: who.id, requesterCompany: who.companyId, status: "DRAFT", audit: [{ action: "CREATED", by: who.id }] }); return res.status(201).json({ success: true, data: row });
  }
  async publishRequirement(req: Request, res: Response) {
    const who = await actor(req); const row: any = await FreightRequirementModel.findById(req.params.id); if (!row || !await managed(req, row.requesterCompany, who?.companyId)) return fail(res, 404, "Requirement not found.");
    const opensAt = new Date(req.body.opensAt), closesAt = new Date(req.body.closesAt); if (Number.isNaN(+opensAt) || Number.isNaN(+closesAt) || closesAt <= opensAt || closesAt <= new Date()) return fail(res, 400, "A valid quotation window is required."); row.opensAt = opensAt; row.closesAt = closesAt; row.status = opensAt <= new Date() ? "OPEN" : "SCHEDULED"; row.audit.push({ action: "PUBLISHED", by: req.user?.id }); await row.save(); return res.json({ success: true, data: row });
  }
  async submitOffer(req: Request, res: Response) {
    const who = await actor(req); const requirement: any = await FreightRequirementModel.findById(req.params.id); if (!who?.companyId || !requirement || requirement.status !== "OPEN" || new Date(requirement.closesAt) <= new Date()) return fail(res, 409, "Requirement is not open."); if (id(requirement.requesterCompany) === who.companyId) return fail(res, 409, "The requester cannot quote its own requirement.");
    const profile = await FreightProviderProfileModel.exists({ companyId: who.companyId, status: "PUBLISHED", "published.modes": { $in: requirement.modes } }); if (!profile) return fail(res, 403, "Publish a matching freight profile before quoting."); const amount = Number(req.body.amount); if (!(amount > 0) || !req.body.currency) return fail(res, 400, "Amount and currency are required.");
    const current: any = await FreightOfferModel.findOne({ requirement: requirement._id, providerCompany: who.companyId }); const revisions = current ? [...(current.revisions || []), { snapshot: current.toObject(), by: who.id }] : [];
    const row = await FreightOfferModel.findOneAndUpdate({ requirement: requirement._id, providerCompany: who.companyId }, { $set: { ...req.body, amount, provider: who.id, status: "SUBMITTED", revisions }, $setOnInsert: { requirement: requirement._id, providerCompany: who.companyId } }, { upsert: true, new: true, runValidators: true }); return res.status(current ? 200 : 201).json({ success: true, data: row });
  }
  async closeRequirement(req: Request, res: Response) {
    const who = await actor(req); const row: any = await FreightRequirementModel.findById(req.params.id); if (!row || !await managed(req, row.requesterCompany, who?.companyId)) return fail(res, 404, "Requirement not found."); if (!["OPEN", "SCHEDULED"].includes(row.status)) return fail(res, 409, "Requirement cannot be closed."); row.status = "CLOSED"; row.closesAt = new Date(); row.audit.push({ action: "CLOSED", by: req.user?.id }); await row.save(); return res.json({ success: true, data: row });
  }
  async award(req: Request, res: Response) {
    const who = await actor(req); const requirement: any = await FreightRequirementModel.findById(req.params.id); if (!requirement || !await managed(req, requirement.requesterCompany, who?.companyId)) return fail(res, 404, "Requirement not found."); if (requirement.status === "AWARDED" && requirement.shipment) return res.json({ success: true, data: requirement }); if (requirement.status !== "CLOSED") return fail(res, 409, "Close quotations before awarding.");
    const offer: any = await FreightOfferModel.findOne({ _id: req.body.offerId, requirement: requirement._id, status: "SUBMITTED" }); if (!offer) return fail(res, 400, "Select a valid offer.");
    const shipment: any = await FreightShipmentModel.create({ reference: shipmentRef(), ownerCompany: offer.providerCompany, createdBy: req.user?.id, customerCompany: requirement.requesterCompany, source: "OBAOL_AWARD", workflowMode: "FULL", status: "BOOKING_REQUESTED", modes: requirement.modes, movementType: requirement.movementType, origin: requirement.origin, destination: requirement.destination, incoterm: requirement.incoterm, serviceLevel: requirement.serviceLevel, cargo: requirement.cargo ? [requirement.cargo] : [], milestones: defaultMilestones(requirement.modes), requirement: requirement._id, offer: offer._id, enquiryId: requirement.enquiryId, orderId: requirement.orderId, audit: [{ action: "CREATED_FROM_AWARD", by: req.user?.id }] });
    requirement.status = "AWARDED"; requirement.winningOffer = offer._id; requirement.shipment = shipment._id; requirement.audit.push({ action: "AWARDED", by: req.user?.id, detail: { offerId: offer._id } }); await requirement.save(); offer.status = "AWARDED"; await offer.save(); await FreightOfferModel.updateMany({ requirement: requirement._id, _id: { $ne: offer._id }, status: "SUBMITTED" }, { $set: { status: "NOT_SELECTED" } }); return res.status(201).json({ success: true, data: requirement, shipment });
  }
  async shipments(req: Request, res: Response) {
    const who = await actor(req); if (!who && !staff(req)) return fail(res, 403, "Access required."); const filter: any = { archivedAt: null }; if (role(req) === "associate") filter.$or = [{ ownerCompany: who!.companyId }, { customerCompany: who!.companyId }]; else { const scope = await scoped(req); if (scope) filter.ownerCompany = { $in: scope }; } if (req.query.state === "history") filter.status = { $in: ["CLOSED", "CANCELLED"] }; else if (req.query.state === "active") filter.status = { $nin: ["CLOSED", "CANCELLED"] }; if (req.query.workflowMode) filter.workflowMode = req.query.workflowMode;
    return res.json({ success: true, data: await FreightShipmentModel.find(filter).populate("ownerCompany customerCompany", "name").sort({ updatedAt: -1 }).limit(300).lean() });
  }
  async createShipment(req: Request, res: Response) {
    const who = await actor(req); if (!who?.companyId && !staff(req)) return fail(res, 403, "Company access required."); const ownerCompany = req.body.ownerCompany || who?.companyId; if (!valid(ownerCompany) || !await managed(req, ownerCompany, who?.companyId)) return fail(res, 403, "Company access required."); const modes = (req.body.modes || []).map((x: string) => x.toUpperCase()); if (!modes.length || !req.body.origin || !req.body.destination) return fail(res, 400, "Mode, origin, and destination are required.");
    const row = await FreightShipmentModel.create({ ...req.body, reference: req.body.reference || shipmentRef(), ownerCompany, createdBy: req.user?.id, source: req.body.source || "MANUAL_OFFLINE", workflowMode: req.body.workflowMode || "FULL", modes, milestones: req.body.milestones?.length ? req.body.milestones : defaultMilestones(modes), audit: [{ action: "CREATED", by: req.user?.id }] }); return res.status(201).json({ success: true, data: row });
  }
  async shipment(req: Request, res: Response) {
    const who = await actor(req); const row: any = await FreightShipmentModel.findById(req.params.id).populate("ownerCompany customerCompany", "name").lean(); if (!await canSeeShipment(req, row, who)) return fail(res, 404, "Shipment not found."); return res.json({ success: true, data: row });
  }
  async updateShipment(req: Request, res: Response) {
    const who = await actor(req); const row: any = await FreightShipmentModel.findById(req.params.id); if (!await canSeeShipment(req, row, who)) return fail(res, 404, "Shipment not found."); if (id(row.customerCompany) === who?.companyId && id(row.ownerCompany) !== who?.companyId && !staff(req)) return fail(res, 403, "The customer has read-only shipment access.");
    const protectedFields = ["_id", "ownerCompany", "createdBy", "source", "audit", "reference", "__v"]; const changes = { ...req.body }; protectedFields.forEach((key) => delete changes[key]); if (row.workflowMode === "FULL" && changes.workflowMode === "LEGACY") return fail(res, 409, "A full shipment cannot be downgraded to legacy."); Object.assign(row, changes); row.audit.push({ action: changes.workflowMode === "FULL" && row.workflowMode === "LEGACY" ? "UPGRADED_TO_FULL" : "UPDATED", by: req.user?.id }); await row.save(); return res.json({ success: true, data: row });
  }
  async addShipmentItem(req: Request, res: Response) {
    const who = await actor(req); const row: any = await FreightShipmentModel.findById(req.params.id); if (!await canSeeShipment(req, row, who) || id(row.ownerCompany) !== who?.companyId && !staff(req)) return fail(res, 403, "Shipment edit access required."); const field = String(req.params.collection); const allowed = new Set(["legs", "containers", "documents", "exceptions", "tasks", "comments"]); if (!allowed.has(field)) return fail(res, 400, "Unsupported shipment collection."); row[field].push({ ...req.body, uploadedBy: field === "documents" ? req.user?.id : undefined }); row.audit.push({ action: `ADDED_${field.toUpperCase()}`, by: req.user?.id }); await row.save(); return res.status(201).json({ success: true, data: row });
  }
  async milestone(req: Request, res: Response) {
    const who = await actor(req); const row: any = await FreightShipmentModel.findById(req.params.id); if (!await canSeeShipment(req, row, who) || id(row.ownerCompany) !== who?.companyId && !staff(req)) return fail(res, 403, "Shipment edit access required."); const item: any = row.milestones.id(req.params.milestoneId); if (!item) return fail(res, 404, "Milestone not found."); Object.assign(item, req.body, { updatedBy: req.user?.id }); row.audit.push({ action: "MILESTONE_UPDATED", by: req.user?.id, detail: { milestoneId: item._id, status: item.status } }); await row.save(); return res.json({ success: true, data: row });
  }
  async tracking(req: Request, res: Response) {
    const row: any = await FreightShipmentModel.findOne({ trackingToken: req.params.token, archivedAt: null }).lean(); if (!row) return fail(res, 404, "Tracking link not found."); return res.json({ success: true, data: { reference: row.reference, status: row.status, modes: row.modes, origin: row.origin, destination: row.destination, milestones: row.milestones, documents: (row.documents || []).filter((x: any) => x.sharedWithCustomer && x.status === "APPROVED").map(({ kind, name, url, version, uploadedAt }: any) => ({ kind, name, url, version, uploadedAt })) } });
  }
  async customs(req: Request, res: Response) {
    const who = await actor(req); const filter: any = { archivedAt: null }; if (role(req) === "associate") filter.ownerCompany = who?.companyId; else { const scope = await scoped(req); if (scope) filter.ownerCompany = { $in: scope }; } return res.json({ success: true, data: await CustomsCaseModel.find(filter).populate("shipment", "reference status origin destination").sort({ updatedAt: -1 }).lean() });
  }
  async createCustoms(req: Request, res: Response) {
    const who = await actor(req); const shipment: any = await FreightShipmentModel.findById(req.body.shipment); if (!await canSeeShipment(req, shipment, who) || id(shipment.ownerCompany) !== who?.companyId && !staff(req)) return fail(res, 403, "Shipment access required."); const row = await CustomsCaseModel.create({ ...req.body, ownerCompany: shipment.ownerCompany, audit: [{ action: "CREATED", by: req.user?.id }] }); return res.status(201).json({ success: true, data: row });
  }
  async updateCustoms(req: Request, res: Response) {
    const who = await actor(req); const row: any = await CustomsCaseModel.findById(req.params.id); if (!row || !await managed(req, row.ownerCompany, who?.companyId)) return fail(res, 404, "Customs case not found."); const changes = { ...req.body }; ["ownerCompany", "shipment", "audit", "_id", "__v"].forEach((key) => delete changes[key]); Object.assign(row, changes); row.audit.push({ action: "UPDATED", by: req.user?.id, detail: { status: row.status } }); await row.save(); return res.json({ success: true, data: row });
  }
  async filingPackage(req: Request, res: Response) {
    const who = await actor(req); const row: any = await CustomsCaseModel.findById(req.params.id); if (!row || !await managed(req, row.ownerCompany, who?.companyId)) return fail(res, 404, "Customs case not found."); const required = ["portCode", "iec", "gstin", "declarationType"]; const missing = required.filter((key) => !row[key]); if (!row.lineItems?.length) missing.push("lineItems"); if (missing.length) return fail(res, 400, `Missing filing data: ${missing.join(", ")}`, missing); row.filingPayload = { schema: "OBAOL_INDIA_CUSTOMS_V1", generatedAt: new Date(), caseType: row.caseType, declarationType: row.declarationType, portCode: row.portCode, iec: row.iec, gstin: row.gstin, adCode: row.adCode, invoice: row.invoice, packing: row.packing, lineItems: row.lineItems, licences: row.licences, schemes: row.schemes }; row.status = "READY_TO_FILE"; row.audit.push({ action: "FILING_PACKAGE_GENERATED", by: req.user?.id }); await row.save(); return res.json({ success: true, data: row.filingPayload });
  }
  async finance(req: Request, res: Response) {
    const who = await actor(req); const filter: any = { archivedAt: null }; if (role(req) === "associate") filter.ownerCompany = who?.companyId; else { const scope = await scoped(req); if (scope) filter.ownerCompany = { $in: scope }; } if (req.query.kind) filter.kind = req.query.kind; const rows = await FreightFinanceModel.find(filter).populate("shipment", "reference customerName").sort({ createdAt: -1 }).lean(); return res.json({ success: true, data: rows });
  }
  async createFinance(req: Request, res: Response) {
    const who = await actor(req); const shipment: any = await FreightShipmentModel.findById(req.body.shipment); if (!await canSeeShipment(req, shipment, who) || id(shipment.ownerCompany) !== who?.companyId && !staff(req)) return fail(res, 403, "Shipment access required."); const lines = req.body.lines || []; const subtotal = lines.reduce((sum: number, line: any) => sum + Number(line.quantity || 1) * Number(line.rate || 0), 0); const taxTotal = lines.reduce((sum: number, line: any) => sum + Number(line.taxAmount || 0), 0); const row = await FreightFinanceModel.create({ ...req.body, ownerCompany: shipment.ownerCompany, subtotal, taxTotal, total: subtotal + taxTotal, audit: [{ action: "CREATED", by: req.user?.id }] }); return res.status(201).json({ success: true, data: row });
  }
  async postFinance(req: Request, res: Response) {
    const who = await actor(req); const row: any = await FreightFinanceModel.findById(req.params.id); if (!row || !await managed(req, row.ownerCompany, who?.companyId)) return fail(res, 404, "Finance record not found."); if (row.status === "POSTED") return res.json({ success: true, data: row }); if (!['DRAFT', 'APPROVED'].includes(row.status)) return fail(res, 409, "Only draft or approved records can be posted."); if (row.kind === "JOURNAL") { const debit = (row.journalLines || []).reduce((sum: number, line: any) => sum + Number(line.debit || 0), 0), credit = (row.journalLines || []).reduce((sum: number, line: any) => sum + Number(line.credit || 0), 0); if (Math.abs(debit - credit) > 0.01) return fail(res, 400, "Journal debits and credits must balance."); } row.status = "POSTED"; row.postedAt = new Date(); row.audit.push({ action: "POSTED", by: req.user?.id }); await row.save(); return res.json({ success: true, data: row });
  }
  async reports(req: Request, res: Response) {
    const who = await actor(req); const match: any = { archivedAt: null }; if (role(req) === "associate") match.ownerCompany = new Types.ObjectId(who!.companyId); else { const scope = await scoped(req); if (scope) match.ownerCompany = { $in: scope }; } const rows: any[] = await FreightFinanceModel.find(match).lean(); const totals = rows.reduce((out, row) => { const total = Number(row.total || 0) * Number(row.exchangeRate || 1); if (["CUSTOMER_INVOICE", "DEBIT_NOTE"].includes(row.kind)) out.revenue += total; if (["VENDOR_BILL", "CREDIT_NOTE"].includes(row.kind)) out.cost += total; out.outstanding += Math.max(0, total - Number(row.paidAmount || 0)); return out; }, { revenue: 0, cost: 0, outstanding: 0 }); return res.json({ success: true, data: { ...totals, grossProfit: totals.revenue - totals.cost, margin: totals.revenue ? ((totals.revenue - totals.cost) / totals.revenue) * 100 : 0, documentCount: rows.length } });
  }
}
export const freightForwardingController = new FreightForwardingController();

