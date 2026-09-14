import { Router, Request, Response } from "express";
import { randomBytes, randomInt, createHash, timingSafeEqual } from "crypto";
import { Types } from "mongoose";
import authenticateToken from "../../middlewares/auth";
import { AssociateModel } from "../../database/models/associate";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { CommercialCustomerModel as Customer, CommercialDocumentModel as Document, CommercialSequenceModel as Sequence } from "../../database/models/commercialDocument";
import { sendTradeDocumentEmail } from "../../utils/mailer";

const router = Router();
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const bad = (res: Response, code: number, message: string) => res.status(code).json({ success: false, message });
const valid = (id: any) => Types.ObjectId.isValid(String(id || ""));
const safe = (fn: (req: Request, res: Response) => Promise<any>) => (req: Request, res: Response) => { fn(req, res).catch((error: any) => { if (!res.headersSent) bad(res, 500, error.message || "Request failed."); }); };
const expose = (doc: any) => { const obj = doc.toObject ? doc.toObject() : { ...doc }; delete obj.shareTokenHash; delete obj.codeHash; delete obj.codeAttempts; return obj; };

async function company(req: Request, res: Response) {
  if (req.user?.role?.toLowerCase() !== "associate" || !valid(req.user?.id)) { bad(res, 403, "A verified company account is required."); return null; }
  const associate: any = await AssociateModel.findById(req.user.id).select("associateCompany").lean();
  const result: any = valid(associate?.associateCompany) ? await AssociateCompanyModel.findOne({ _id: associate.associateCompany, registrationStatus: "APPROVED", isDeleted: { $ne: true } }).select("name email phone address gstin logo").lean() : null;
  if (!result) bad(res, 403, "Company verification is required.");
  return result;
}
async function owned(req: Request, res: Response) {
  const issuer = await company(req, res); if (!issuer) return null;
  if (!valid(req.params.id)) { bad(res, 400, "Invalid document id."); return null; }
  const doc: any = await Document.findOne({ _id: req.params.id, ownerCompanyId: issuer._id }).select("+shareTokenHash +codeHash");
  if (!doc) { bad(res, 404, "Document not found."); return null; }
  return { issuer, doc };
}
function customerInput(body: any) {
  const data = { name: String(body?.name || "").trim(), email: String(body?.email || "").trim().toLowerCase(), contactName: String(body?.contactName || "").trim(), billingAddress: String(body?.billingAddress || "").trim(), phone: String(body?.phone || "").trim(), gstin: String(body?.gstin || "").trim(), linkedCompanyId: valid(body?.linkedCompanyId) ? body.linkedCompanyId : null };
  if (!data.name || !/^\S+@\S+\.\S+$/.test(data.email) || !data.contactName || !data.billingAddress) throw new Error("Customer name, contact, email and billing address are required.");
  return data;
}
function documentInput(body: any, issuer: any, customer: any) {
  if (!Array.isArray(body?.items) || !body.items.length || body.items.length > 100) throw new Error("Add 1 to 100 product items.");
  const items = body.items.map((item: any) => {
    const description = String(item.description || "").trim(), unit = String(item.unit || "").trim();
    const quantity = Number(item.quantity), unitPrice = Number(item.unitPrice), taxRate = Number(item.taxRate || 0);
    if (!description || !unit || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("Check item description, unit, quantity, price and tax rate.");
    const subtotal = round(quantity * unitPrice), taxAmount = round(subtotal * taxRate / 100);
    return { productId: valid(item.productId) ? item.productId : null, description, unit, quantity, unitPrice, taxRate, subtotal, taxAmount, total: round(subtotal + taxAmount) };
  });
  const issueDate = new Date(body.issueDate || Date.now()), validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (isNaN(issueDate.getTime()) || (validUntil && (isNaN(validUntil.getTime()) || validUntil < issueDate))) throw new Error("Check document dates.");
  const currency = String(body.currency || "INR").toUpperCase(); if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Enter a three-letter currency code.");
  return { issuer: { name: issuer.name, email: issuer.email, phone: issuer.phone, billingAddress: issuer.address, gstin: issuer.gstin, logo: issuer.logo }, recipient: { name: customer.name, email: customer.email, phone: customer.phone, billingAddress: customer.billingAddress, gstin: customer.gstin, contactName: customer.contactName }, items, currency, issueDate, validUntil, terms: String(body.terms || ""), notes: String(body.notes || ""), subtotal: round(items.reduce((n: number, i: any) => n + i.subtotal, 0)), taxAmount: round(items.reduce((n: number, i: any) => n + i.taxAmount, 0)), total: round(items.reduce((n: number, i: any) => n + i.total, 0)) };
}
async function number(companyId: any, type: string) {
  const year = new Date().getUTCFullYear();
  const seq: any = await Sequence.findOneAndUpdate({ ownerCompanyId: companyId, type, year }, { $inc: { value: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return `${companyId}-${type === "QUOTATION" ? "QT" : "INV"}-${year}-${String(seq.value).padStart(5, "0")}`;
}
router.get("/customers", authenticateToken, safe(async (req, res) => { const issuer = await company(req, res); if (issuer) res.json({ success: true, data: await Customer.find({ ownerCompanyId: issuer._id }).sort({ updatedAt: -1 }).limit(500).lean() }); }));
router.post("/customers", authenticateToken, safe(async (req, res) => {
  const issuer = await company(req, res); if (!issuer) return;
  let input; try { input = customerInput(req.body); } catch (e: any) { return bad(res, 400, e.message); }
  if (input.linkedCompanyId && !await AssociateCompanyModel.exists({ _id: input.linkedCompanyId, registrationStatus: "APPROVED", isDeleted: { $ne: true } })) return bad(res, 400, "Linked Pure company is unavailable.");
  res.status(201).json({ success: true, data: await Customer.create({ ...input, ownerCompanyId: issuer._id }) });
}));
router.patch("/customers/:id", authenticateToken, safe(async (req, res) => {
  const issuer = await company(req, res); if (!issuer) return; if (!valid(req.params.id)) return bad(res, 400, "Invalid customer id.");
  let input; try { input = customerInput(req.body); } catch (e: any) { return bad(res, 400, e.message); }
  if (input.linkedCompanyId && !await AssociateCompanyModel.exists({ _id: input.linkedCompanyId, registrationStatus: "APPROVED", isDeleted: { $ne: true } })) return bad(res, 400, "Linked Pure company is unavailable.");
  const row = await Customer.findOneAndUpdate({ _id: req.params.id, ownerCompanyId: issuer._id }, input, { new: true, runValidators: true });
  return row ? res.json({ success: true, data: row }) : bad(res, 404, "Customer not found.");
}));
router.get("/", authenticateToken, safe(async (req, res) => { const issuer = await company(req, res); if (!issuer) return; const filter: any = { ownerCompanyId: issuer._id }; if (["QUOTATION", "INVOICE"].includes(String(req.query.type))) filter.type = req.query.type; res.json({ success: true, data: (await Document.find(filter).sort({ createdAt: -1 }).limit(200).lean()).map(expose) }); }));
router.post("/", authenticateToken, safe(async (req, res) => {
  const issuer = await company(req, res); if (!issuer) return;
  const type = String(req.body.type || "").toUpperCase(); if (!["QUOTATION", "INVOICE"].includes(type)) return bad(res, 400, "Choose quotation or invoice.");
  const customer: any = valid(req.body.customerId) ? await Customer.findOne({ _id: req.body.customerId, ownerCompanyId: issuer._id }).lean() : null;
  if (!customer) return bad(res, 404, "Customer not found.");
  let input; try { input = documentInput(req.body, issuer, customer); } catch (e: any) { return bad(res, 400, e.message); }
  const doc = await Document.create({ ...input, ownerCompanyId: issuer._id, customerId: customer._id, type, number: await number(issuer._id, type) });
  res.status(201).json({ success: true, data: expose(doc) });
}));
router.get("/:id", authenticateToken, safe(async (req, res) => { const result = await owned(req, res); if (result) res.json({ success: true, data: expose(result.doc) }); }));
router.get("/:id/revisions", authenticateToken, safe(async (req, res) => {
  const result = await owned(req, res); if (!result) return;
  const root = result.doc.revisionOf || result.doc._id;
  const rows = await Document.find({ ownerCompanyId: result.issuer._id, $or: [{ _id: root }, { revisionOf: root }] }).sort({ revision: 1 }).lean();
  res.json({ success: true, data: rows.map(expose) });
}));
router.patch("/:id", authenticateToken, safe(async (req, res) => {
  const result = await owned(req, res); if (!result) return; const { issuer, doc } = result;
  if (doc.status !== "DRAFT") return bad(res, 409, "Sent documents are immutable. Create a revision.");
  const customer: any = await Customer.findOne({ _id: req.body.customerId || doc.customerId, ownerCompanyId: issuer._id }).lean(); if (!customer) return bad(res, 404, "Customer not found.");
  let input; try { input = documentInput(req.body, issuer, customer); } catch (e: any) { return bad(res, 400, e.message); }
  Object.assign(doc, input, { customerId: customer._id }); await doc.save(); res.json({ success: true, data: expose(doc) });
}));
router.post("/:id/revise", authenticateToken, safe(async (req, res) => {
  const result = await owned(req, res); if (!result) return; const { doc } = result;
  if (doc.status === "DRAFT") return bad(res, 409, "Edit the draft directly.");
  if (!doc.shareRevokedAt && doc.shareTokenHash) { doc.shareRevokedAt = new Date(); await doc.save(); }
  const revision = await Document.create({ ...expose(doc), _id: undefined, createdAt: undefined, updatedAt: undefined, number: await number(doc.ownerCompanyId, doc.type), revision: doc.revision + 1, revisionOf: doc.revisionOf || doc._id, sourceQuotationId: null, status: "DRAFT", paymentStatus: "UNPAID", paymentRecordedAt: null, paymentReference: "", sentAt: null, shareExpiresAt: null, shareRevokedAt: null, decision: null, decidedAt: null, decidedByEmail: null });
  res.status(201).json({ success: true, data: expose(revision) });
}));
router.post("/:id/send", authenticateToken, safe(async (req, res) => {
  const result = await owned(req, res); if (!result) return; const { doc } = result;
  if (!["DRAFT", "SENT"].includes(doc.status)) return bad(res, 409, "Document cannot be sent.");
  const token = randomBytes(32).toString("hex"), url = `${String(process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "")}/documents/share/${token}`;
  await sendTradeDocumentEmail(doc.recipient.email, `${doc.issuer.name}: ${doc.type.toLowerCase()} ${doc.number}`, `<p>${doc.issuer.name} shared ${doc.type.toLowerCase()} ${doc.number}.</p><p><a href="${url}">View document</a></p>`, `View ${doc.type.toLowerCase()} ${doc.number}: ${url}`);
  doc.status = "SENT"; doc.sentAt = new Date(); doc.shareTokenHash = hash(token); doc.shareExpiresAt = new Date(Date.now() + 30 * 86400000); doc.shareRevokedAt = null; await doc.save();
  res.json({ success: true, data: expose(doc), shareUrl: url });
}));
router.post("/:id/revoke", authenticateToken, safe(async (req, res) => { const result = await owned(req, res); if (!result) return; result.doc.shareRevokedAt = new Date(); await result.doc.save(); res.json({ success: true, data: expose(result.doc) }); }));
router.post("/:id/payment", authenticateToken, safe(async (req, res) => {
  const result = await owned(req, res); if (!result) return; const { doc } = result;
  if (doc.type !== "INVOICE" || doc.status !== "SENT") return bad(res, 409, "Only issued invoices can have payment status.");
  if (!["PAID", "UNPAID"].includes(req.body.status)) return bad(res, 400, "Choose PAID or UNPAID.");
  doc.paymentStatus = req.body.status; doc.paymentRecordedAt = req.body.status === "PAID" ? new Date() : null; doc.paymentReference = req.body.status === "PAID" ? String(req.body.reference || "") : ""; await doc.save(); res.json({ success: true, data: expose(doc) });
}));
router.post("/:id/to-invoice", authenticateToken, safe(async (req, res) => {
  const result = await owned(req, res); if (!result) return; const { doc } = result;
  if (doc.type !== "QUOTATION" || doc.status !== "ACCEPTED") return bad(res, 409, "An accepted quotation is required.");
  const existing = await Document.findOne({ ownerCompanyId: doc.ownerCompanyId, sourceQuotationId: doc._id }); if (existing) return res.json({ success: true, data: expose(existing) });
  const invoice = await Document.create({ ...expose(doc), _id: undefined, createdAt: undefined, updatedAt: undefined, type: "INVOICE", number: await number(doc.ownerCompanyId, "INVOICE"), revision: 1, revisionOf: null, sourceQuotationId: doc._id, status: "DRAFT", validUntil: null, sentAt: null, shareExpiresAt: null, shareRevokedAt: null, decision: null, decidedAt: null, decidedByEmail: null });
  res.status(201).json({ success: true, data: expose(invoice) });
}));
async function shared(req: Request, res: Response) {
  const token = String(req.params.token || ""); if (!/^[a-f0-9]{64}$/.test(token)) { bad(res, 404, "Link not found."); return null; }
  const doc: any = await Document.findOne({ shareTokenHash: hash(token) }).select("+shareTokenHash +codeHash");
  if (!doc || !doc.shareExpiresAt || doc.shareExpiresAt.getTime() < Date.now() || doc.shareRevokedAt || !["SENT", "ACCEPTED", "DECLINED"].includes(doc.status)) { bad(res, 404, "Link expired or unavailable."); return null; }
  return doc;
}
router.get("/share/:token", safe(async (req, res) => { const doc = await shared(req, res); if (doc) res.json({ success: true, data: expose(doc) }); }));
router.post("/share/:token/code", safe(async (req, res) => {
  const doc = await shared(req, res); if (!doc) return; if (doc.type !== "QUOTATION" || doc.status !== "SENT") return bad(res, 409, "Quotation is no longer awaiting a decision.");
  if (doc.codeSentAt && Date.now() - doc.codeSentAt.getTime() < 60000) return bad(res, 429, "Wait one minute before requesting another code.");
  const code = String(randomInt(100000, 1000000)); await sendTradeDocumentEmail(doc.recipient.email, `Pure verification: ${doc.number}`, `<p>Your code is <strong>${code}</strong>. It expires in 10 minutes.</p>`, `Your code is ${code}. It expires in 10 minutes.`);
  doc.codeHash = hash(code); doc.codeExpiresAt = new Date(Date.now() + 600000); doc.codeSentAt = new Date(); doc.codeAttempts = 0; await doc.save(); res.json({ success: true, message: "Code sent to recipient email." });
}));
router.post("/share/:token/decision", safe(async (req, res) => {
  const doc = await shared(req, res); if (!doc) return; if (doc.type !== "QUOTATION" || doc.status !== "SENT") return bad(res, 409, "Quotation is no longer awaiting a decision.");
  if (!["ACCEPTED", "DECLINED"].includes(req.body.decision)) return bad(res, 400, "Choose accept or decline.");
  if (!doc.codeHash || !doc.codeExpiresAt || doc.codeExpiresAt.getTime() < Date.now() || doc.codeAttempts >= 5) return bad(res, 403, "Code expired or unavailable.");
  if (!timingSafeEqual(Buffer.from(hash(String(req.body.code || "")), "hex"), Buffer.from(doc.codeHash, "hex"))) { doc.codeAttempts += 1; await doc.save(); return bad(res, 403, "Incorrect code."); }
  const now = new Date(); const updated = await Document.findOneAndUpdate({ _id: doc._id, status: "SENT", shareRevokedAt: null, shareExpiresAt: { $gt: now } }, { $set: { status: req.body.decision, decision: req.body.decision, decidedAt: now, decidedByEmail: doc.recipient.email, codeHash: null } }, { new: true });
  if (!updated) return bad(res, 409, "Quotation already decided."); res.json({ success: true, data: expose(updated) });
}));
export default router;
