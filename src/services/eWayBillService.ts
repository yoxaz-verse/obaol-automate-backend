import crypto from "crypto";
import { EWayBillConnectionModel, EWayBillModel } from "../database/models/eWayBill";

export type ProviderResult = { ewayBillNumber?: string; generatedAt?: string; validUntil?: string; status?: string; providerReference?: string; vehicle?: any; transporter?: any; pdfUrl?: string; qrUrl?: string; metadata?: any };
export interface EWayBillProvider {
  test(): Promise<void>; generate(payload: any, idempotencyKey: string): Promise<ProviderResult>; get(ewayBillNumber: string): Promise<ProviderResult>;
  updatePartB(ewayBillNumber: string, payload: any): Promise<ProviderResult>; updateTransporter(ewayBillNumber: string, payload: any): Promise<ProviderResult>;
  cancel(ewayBillNumber: string, payload: any): Promise<ProviderResult>; reject(ewayBillNumber: string, payload: any): Promise<ProviderResult>;
  extend(ewayBillNumber: string, payload: any): Promise<ProviderResult>; artifacts(ewayBillNumber: string): Promise<ProviderResult>;
  lookup(kind: "gstin" | "transin" | "hsn", value: string): Promise<any>;
}

const encryptionKey = () => { const raw = String(process.env.EWAY_CREDENTIAL_ENCRYPTION_KEY || process.env.MAIL_CREDENTIAL_ENCRYPTION_KEY || ""); if (!raw) throw new Error("E-way bill credential encryption is not configured"); return crypto.createHash("sha256").update(raw).digest(); };
export const encryptEWayCredentials = (credentials: any) => { const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv); const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]); return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join("."); };
export const decryptEWayCredentials = (value: string) => { const [iv, tag, encrypted] = value.split("."); const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8")); };

const clean = (value: any): any => Array.isArray(value) ? value.map(clean) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([key]) => !/secret|password|token|credential|authorization/i.test(key)).map(([key, item]) => [key, clean(item)])) : value;
const providerError = (body: any, status: number) => Object.assign(new Error(String(body?.message || body?.error?.message || `GSP request failed (${status})`)), { code: String(body?.code || body?.error?.code || `GSP_${status}`), retryable: status === 408 || status === 429 || status >= 500, details: clean(body) });

class HttpGspProvider implements EWayBillProvider {
  constructor(private config: { baseUrl: string; credentials: any; gstin: string; environment: string }) {}
  private async request(action: string, payload: any = {}, idempotencyKey?: string) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), Number(process.env.EWAY_GSP_TIMEOUT_MS || 20000));
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/${action}`, { method: "POST", signal: controller.signal, headers: { "content-type": "application/json", "x-gstin": this.config.gstin, "x-eway-environment": this.config.environment, ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}), ...(this.config.credentials?.headers || {}) }, body: JSON.stringify({ ...payload, credentials: this.config.credentials }) });
      const body: any = await response.json().catch(() => ({})); if (!response.ok || body?.success === false) throw providerError(body, response.status); return body?.data ?? body;
    } catch (error: any) { if (error?.name === "AbortError") throw Object.assign(new Error("GSP request timed out; synchronize before retrying."), { code: "GSP_TIMEOUT", retryable: true, ambiguous: true }); throw error; }
    finally { clearTimeout(timer); }
  }
  test = async () => { await this.request("connection/test"); };
  generate = (payload: any, key: string) => this.request("eway-bills/generate", payload, key);
  get = (number: string) => this.request("eway-bills/get", { ewayBillNumber: number });
  updatePartB = (number: string, payload: any) => this.request("eway-bills/update-part-b", { ewayBillNumber: number, ...payload });
  updateTransporter = (number: string, payload: any) => this.request("eway-bills/update-transporter", { ewayBillNumber: number, ...payload });
  cancel = (number: string, payload: any) => this.request("eway-bills/cancel", { ewayBillNumber: number, ...payload });
  reject = (number: string, payload: any) => this.request("eway-bills/reject", { ewayBillNumber: number, ...payload });
  extend = (number: string, payload: any) => this.request("eway-bills/extend", { ewayBillNumber: number, ...payload });
  artifacts = (number: string) => this.request("eway-bills/artifacts", { ewayBillNumber: number });
  lookup = (kind: "gstin" | "transin" | "hsn", value: string) => this.request(`lookups/${kind}`, { value });
}

export const connectionProvider = async (companyId: any) => {
  const connection: any = await EWayBillConnectionModel.findOne({ companyId, status: "CONNECTED" }).select("+encryptedCredentials");
  if (!connection) throw Object.assign(new Error("Connect this company to an e-way bill GSP first."), { statusCode: 409, code: "EWAY_CONNECTION_REQUIRED" });
  const credentials = decryptEWayCredentials(connection.encryptedCredentials), configured = connection.environment === "PRODUCTION" ? process.env.EWAY_GSP_PRODUCTION_URL : process.env.EWAY_GSP_SANDBOX_URL;
  const baseUrl = String(credentials.baseUrl || configured || ""); if (!baseUrl) throw Object.assign(new Error("The selected GSP endpoint is not configured."), { statusCode: 503, code: "GSP_NOT_CONFIGURED" });
  return { connection, provider: new HttpGspProvider({ baseUrl, credentials, gstin: connection.gstin, environment: connection.environment }) as EWayBillProvider };
};

const gstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const pincode = /^[1-9][0-9]{5}$/;
const vehicle = /^(?:[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}|DF[A-Z0-9]{2,13}|TR[A-Z0-9]{2,13}|BP[A-Z0-9]{2,13}|NP[A-Z0-9]{2,13})$/;
export const validateEWayDraft = (draft: any) => {
  const errors: { path: string; message: string }[] = [], required = (path: string, value: any) => { if (value === undefined || value === null || String(value).trim() === "") errors.push({ path, message: "Required" }); };
  required("supplyType", draft?.supplyType); required("subSupplyType", draft?.subSupplyType); required("document.type", draft?.document?.type); required("document.number", draft?.document?.number); required("document.date", draft?.document?.date);
  [["from.gstin", draft?.from?.gstin], ["to.gstin", draft?.to?.gstin]].forEach(([path, value]) => { required(String(path), value); if (value && value !== "URP" && !gstin.test(String(value).toUpperCase())) errors.push({ path: String(path), message: "Invalid GSTIN" }); });
  [["from.pincode", draft?.from?.pincode], ["to.pincode", draft?.to?.pincode]].forEach(([path, value]) => { required(String(path), value); if (value && !pincode.test(String(value))) errors.push({ path: String(path), message: "Invalid pincode" }); });
  if (!Array.isArray(draft?.items) || !draft.items.length) errors.push({ path: "items", message: "At least one goods item is required" });
  (draft?.items || []).forEach((item: any, index: number) => { required(`items.${index}.description`, item.description); required(`items.${index}.hsnCode`, item.hsnCode); required(`items.${index}.quantity`, item.quantity); if (!(Number(item.taxableValue) >= 0)) errors.push({ path: `items.${index}.taxableValue`, message: "Invalid taxable value" }); });
  if (!(Number(draft?.totalInvoiceValue) > 0)) errors.push({ path: "totalInvoiceValue", message: "Invoice value must be greater than zero" });
  if (!(Number(draft?.transport?.distanceKm) > 0)) errors.push({ path: "transport.distanceKm", message: "Distance must be greater than zero" });
  if (draft?.transport?.mode === "ROAD" && draft?.transport?.vehicleNumber && !vehicle.test(String(draft.transport.vehicleNumber).replace(/\s/g, "").toUpperCase())) errors.push({ path: "transport.vehicleNumber", message: "Invalid vehicle number" });
  return errors;
};

const statusMap = (value: any) => { const status = String(value || "ACTIVE").toUpperCase(); if (["CNL", "CANCELLED"].includes(status)) return "CANCELLED"; if (["REJECTED", "REJ"].includes(status)) return "REJECTED"; if (["EXPIRED", "EXP"].includes(status)) return "EXPIRED"; return "ACTIVE"; };
export const applyProviderResult = (bill: any, result: ProviderResult, action: string, by?: any) => {
  if (result.ewayBillNumber) bill.ewayBillNumber = String(result.ewayBillNumber); if (result.generatedAt) bill.generatedAt = new Date(result.generatedAt); if (result.validUntil) bill.validUntil = new Date(result.validUntil);
  bill.rawProviderStatus = result.status || bill.rawProviderStatus; bill.status = statusMap(result.status); bill.providerReference = result.providerReference || bill.providerReference;
  if (result.vehicle) bill.currentVehicle = result.vehicle; if (result.transporter) bill.currentTransporter = result.transporter;
  if (result.pdfUrl || result.qrUrl) bill.artifacts = { ...bill.artifacts, ...(result.pdfUrl ? { pdfUrl: result.pdfUrl } : {}), ...(result.qrUrl ? { qrUrl: result.qrUrl } : {}) };
  bill.providerMetadata = clean(result.metadata || {}); bill.lastSyncedAt = new Date(); bill.nextSyncAt = new Date(Date.now() + 60 * 60 * 1000); bill.lastError = undefined; bill.submissionLockUntil = undefined; bill.audit.push({ action, by, detail: clean(result) });
};

export const reconcileActiveEWayBills = async () => {
  const rows: any[] = await EWayBillModel.find({ status: { $in: ["ACTIVE", "SYNC_REQUIRED", "SUBMITTING"] }, ewayBillNumber: { $exists: true }, nextSyncAt: { $lte: new Date() }, archivedAt: null }).limit(50);
  let count = 0; for (const bill of rows) try { const { provider } = await connectionProvider(bill.companyId); applyProviderResult(bill, await provider.get(bill.ewayBillNumber), "SCHEDULED_SYNC"); await bill.save(); count++; } catch (error: any) { bill.status = "SYNC_REQUIRED"; bill.lastError = { code: error?.code || "SYNC_FAILED", message: error?.message }; bill.nextSyncAt = new Date(Date.now() + 30 * 60 * 1000); await bill.save().catch(() => undefined); } return count;
};
