import { createHash, randomUUID } from "crypto";
import { GstAdjustmentModel, GstPurchaseModel } from "../database/models/gst";
import { TradeDocumentModel } from "../database/models/tradeDocument";

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const roundMoney = (n: unknown) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
export const periodRange = (period: string) => {
  if (!/^\d{6}$/.test(period)) throw Object.assign(new Error("Period must be MMYYYY."), { status: 400 });
  const month = Number(period.slice(0, 2)), year = Number(period.slice(2));
  if (month < 1 || month > 12 || year < 2017) throw Object.assign(new Error("Invalid GST period."), { status: 400 });
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
};
export const computeTax = (taxableValue: number, rate: number, originState: string, placeOfSupply: string, cessRate = 0) => {
  const base = roundMoney(taxableValue), gst = roundMoney(base * Number(rate || 0) / 100), cess = roundMoney(base * Number(cessRate || 0) / 100);
  return originState === placeOfSupply ? { taxableValue: base, cgst: roundMoney(gst / 2), sgst: roundMoney(gst / 2), igst: 0, cess } : { taxableValue: base, cgst: 0, sgst: 0, igst: gst, cess };
};
const sumTax = (rows: any[]) => rows.reduce((a, row) => { for (const key of ["taxableValue", "cgst", "sgst", "igst", "cess"]) a[key] = roundMoney(a[key] + Number(row[key] || 0)); return a; }, { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 });
const invoiceGst = (doc: any, stateCode: string) => {
  const meta = doc.gst || doc.documentData?.gst || {};
  const items = (doc.lineItems || []).map((item: any) => ({
    hsnSac: item.hsnSac || "", description: item.description || item.productName || "", taxRate: Number(item.taxRate || 0),
    ...computeTax(Number(item.taxableValue ?? item.amount ?? (Number(item.quantity || 0) * Number(item.unitPrice || 0))), Number(item.taxRate || 0), stateCode, String(meta.placeOfSupply || ""), Number(item.cessRate || 0)),
  }));
  return { id: doc._id, invoiceNumber: doc.documentNumber, invoiceDate: doc.issueDate, recipientGstin: doc.buyer?.gstin || "", recipientType: meta.recipientType || (doc.buyer?.gstin ? "REGISTERED" : "UNREGISTERED"), supplyType: meta.supplyType || "DOMESTIC", placeOfSupply: meta.placeOfSupply || "", reverseCharge: Boolean(meta.reverseCharge), noteType: meta.noteType || null, originalInvoiceId: meta.originalInvoiceId || null, items, totals: sumTax(items) };
};
export async function buildReturnSnapshot(ownerCompanyId: any, registration: any, period: string, returnType: "GSTR1" | "GSTR3B") {
  const range = periodRange(period);
  const docs: any[] = await TradeDocumentModel.find({ ownerCompanyId, type: "INVOICE", status: { $ne: "CANCELLED" }, issuedAt: { $ne: null }, issueDate: { $gte: range.start, $lt: range.end }, $or: [{ "gst.registrationId": registration._id }, { "documentData.gst.registrationId": registration._id }] }).lean();
  const invoices = docs.map(doc => invoiceGst(doc, registration.stateCode));
  const errors: string[] = [];
  invoices.forEach(i => { if (!/^\d{2}$/.test(i.placeOfSupply)) errors.push(`${i.invoiceNumber}: place of supply is required.`); i.items.forEach((x: any) => { if (!x.hsnSac) errors.push(`${i.invoiceNumber}: HSN/SAC is required.`); }); });
  const adjustments: any[] = await GstAdjustmentModel.find({ ownerCompanyId, registrationId: registration._id, period }).lean();
  const outward = sumTax(invoices.map(i => i.totals));
  if (returnType === "GSTR1") {
    const sections = { b2b: invoices.filter(i => i.recipientGstin && i.supplyType === "DOMESTIC"), b2c: invoices.filter(i => !i.recipientGstin && i.supplyType === "DOMESTIC"), exports: invoices.filter(i => ["EXPORT", "SEZ"].includes(i.supplyType)), notes: invoices.filter(i => i.noteType), hsn: Object.values(invoices.flatMap(i => i.items).reduce((a: any, x: any) => { const key = `${x.hsnSac}:${x.taxRate}`; a[key] ||= { hsnSac: x.hsnSac, taxRate: x.taxRate, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 }; for (const f of ["taxableValue", "cgst", "sgst", "igst", "cess"]) a[key][f] = roundMoney(a[key][f] + x[f]); return a; }, {})) };
    return { snapshot: { schema: "OBAOL_GSTR1_V1", gstin: registration.gstin, period, sections, adjustments }, totals: outward, errors };
  }
  const purchases: any[] = await GstPurchaseModel.find({ ownerCompanyId, registrationId: registration._id, invoiceDate: { $gte: range.start, $lt: range.end } }).lean();
  const eligible = sumTax(purchases.filter(p => p.itcEligibility === "ELIGIBLE"));
  const reverseCharge = sumTax(purchases.filter(p => p.reverseCharge));
  const reversals = sumTax([...purchases.filter(p => ["BLOCKED", "INELIGIBLE", "REVERSAL"].includes(p.itcEligibility)), ...adjustments.filter(a => a.kind === "ITC_REVERSAL")]);
  if (!purchases.length) errors.push("Purchase register is empty; confirm zero ITC before filing.");
  return { snapshot: { schema: "OBAOL_GSTR3B_V1", gstin: registration.gstin, period, outward, reverseCharge, itc: { eligible, reversals }, purchases, adjustments }, totals: { outward, eligibleItc: eligible, reverseCharge, reversals }, errors };
}
export const hashSnapshot = (snapshot: any) => createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

export interface GstProvider { initiate(returnRow: any): Promise<any>; verify(returnRow: any, otp: string): Promise<any>; status(returnRow: any): Promise<any>; }
export class MockGstProvider implements GstProvider {
  async initiate() { return { requestId: randomUUID(), status: "OTP_PENDING" }; }
  async verify(_: any, otp: string) { if (!/^\d{6}$/.test(otp)) throw Object.assign(new Error("Enter the 6-digit sandbox OTP."), { status: 400, code: "INVALID_OTP" }); return { status: "FILED", acknowledgementNumber: `ACK${Date.now()}`, arn: `AA${Date.now()}IN` }; }
  async status(row: any) { return { status: row.status, arn: row.arn, acknowledgementNumber: row.acknowledgementNumber }; }
}
export const providerFor = (_registration: any): GstProvider => new MockGstProvider();
