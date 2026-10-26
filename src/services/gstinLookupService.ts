import crypto from "crypto";
import { Request, Response } from "express";
import logger from "../utils/apiLogger";
import { GST_REGEX, hasValidGstinChecksum, normalizeCompanyIdentifier } from "../utils/companyIdentifiers";

export type GstinLookupResult = {
  gstin: string; legalName: string; tradeName: string; registrationStatus: string;
  registrationDate: string; cancellationDate: string; constitution: string; taxpayerType: string;
  registeredAddress: string; stateCode: string; centreJurisdiction: string; stateJurisdiction: string;
  businessActivities: string[]; provider: string; providerReference: string; lookedUpAt: string;
};

const cache = new Map<string, { expiresAt: number; value: GstinLookupResult }>();
export const clearGstinLookupCache = () => cache.clear();
const clean = (value: unknown) => String(value || "").trim();
const cleanList = (value: unknown) => Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, 30) : [];
const positiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const proofSecret = () => process.env.GST_LOOKUP_PROOF_SECRET || process.env.JWT_SECRET || "";
const isActive = (status: string) => ["ACTIVE", "ACT", "VALID"].includes(status.toUpperCase());
const sign = (value: string) => crypto.createHmac("sha256", proofSecret()).update(value).digest("base64url");

type GstLookupMethod = "GET" | "POST";

const configuredMethod = (): GstLookupMethod => clean(process.env.GST_LOOKUP_METHOD).toUpperCase() === "POST" ? "POST" : "GET";

const buildProviderRequest = (gstin: string, signal: AbortSignal): { url: string; init: RequestInit } => {
  const template = clean(process.env.GST_LOOKUP_URL);
  if (!template) throw Object.assign(new Error("GST verification is not configured yet."), { code: "PROVIDER_UNAVAILABLE", status: 503 });

  const method = configuredMethod();
  const hasPlaceholder = template.includes("{gstin}");
  const url = hasPlaceholder
    ? template.split("{gstin}").join(encodeURIComponent(gstin))
    : method === "GET"
      ? `${template.replace(/\/$/, "")}/${encodeURIComponent(gstin)}`
      : template;
  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = clean(process.env.GST_LOOKUP_API_KEY);
  if (apiKey) {
    const header = clean(process.env.GST_LOOKUP_API_KEY_HEADER || "Authorization");
    const prefix = clean(process.env.GST_LOOKUP_API_KEY_PREFIX);
    headers[header] = prefix ? `${prefix} ${apiKey}` : apiKey;
  }

  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    const bodyTemplate = clean(process.env.GST_LOOKUP_BODY_TEMPLATE || '{"gstin":"{gstin}"}');
    let body: string;
    try {
      body = JSON.stringify(JSON.parse(bodyTemplate.split("{gstin}").join(gstin)));
    } catch {
      throw Object.assign(new Error("GST lookup request template is invalid JSON."), { code: "PROVIDER_CONFIGURATION_ERROR", status: 503 });
    }
    return { url, init: { method, headers, body, signal } };
  }

  return { url, init: { method, headers, signal } };
};

export const createGstinProof = (result: GstinLookupResult) => {
  if (!proofSecret()) throw new Error("GST lookup proof secret is not configured.");
  const payload = Buffer.from(JSON.stringify({ ...result, expiresAt: Date.now() + 30 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

export const verifyGstinProof = (token: unknown, expectedGstin: unknown): GstinLookupResult | null => {
  const [payload, signature] = clean(token).split(".");
  if (!payload || !signature || !proofSecret()) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Number(decoded.expiresAt || 0) < Date.now() || normalizeCompanyIdentifier(decoded.gstin) !== normalizeCompanyIdentifier(expectedGstin)) return null;
    const { expiresAt: _expiresAt, ...result } = decoded;
    return result as GstinLookupResult;
  } catch { return null; }
};

const normalizeProviderResponse = (gstin: string, body: any): GstinLookupResult => {
  const data = body?.data || body?.result || body?.taxpayer || body;
  const result: GstinLookupResult = {
    gstin,
    legalName: clean(data?.legalName || data?.legal_name || data?.lgnm),
    tradeName: clean(data?.tradeName || data?.trade_name || data?.tradeNam),
    registrationStatus: clean(data?.registrationStatus || data?.status || data?.sts).toUpperCase(),
    registrationDate: clean(data?.registrationDate || data?.registration_date || data?.rgdt),
    cancellationDate: clean(data?.cancellationDate || data?.cancellation_date || data?.cxdt),
    constitution: clean(data?.constitution || data?.ctb), taxpayerType: clean(data?.taxpayerType || data?.taxpayer_type || data?.dty),
    registeredAddress: clean(data?.registeredAddress || data?.registered_address || data?.principalAddress || data?.pradr?.adr),
    stateCode: clean(data?.stateCode || data?.state_code || gstin.slice(0, 2)),
    centreJurisdiction: clean(data?.centreJurisdiction || data?.centre_jurisdiction || data?.ctj),
    stateJurisdiction: clean(data?.stateJurisdiction || data?.state_jurisdiction || data?.stj),
    businessActivities: cleanList(data?.businessActivities || data?.business_activities || data?.nba),
    provider: clean(process.env.GST_LOOKUP_PROVIDER || "configured-gsp"),
    providerReference: clean(body?.referenceId || body?.requestId || data?.referenceId), lookedUpAt: new Date().toISOString(),
  };
  if (!result.legalName || !result.registrationStatus || !result.registeredAddress) throw Object.assign(new Error("GST provider returned an incomplete response."), { code: "MALFORMED_PROVIDER_RESPONSE" });
  return result;
};

export const lookupGstin = async (value: unknown): Promise<GstinLookupResult> => {
  const gstin = normalizeCompanyIdentifier(value).replace(/\s+/g, "");
  if (!GST_REGEX.test(gstin) || !hasValidGstinChecksum(gstin)) throw Object.assign(new Error("Enter a valid GSTIN."), { code: "INVALID_GSTIN", status: 400 });
  const cached = cache.get(gstin);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), positiveNumber(process.env.GST_LOOKUP_TIMEOUT_MS, 8000));
  try {
    const { url, init } = buildProviderRequest(gstin, controller.signal);
    const response = await fetch(url, init);
    if (response.status === 404) throw Object.assign(new Error("No GST registration was found for this GSTIN."), { code: "NOT_FOUND", status: 404 });
    if (response.status === 401 || response.status === 403) throw Object.assign(new Error("GST verification provider credentials were rejected."), { code: "PROVIDER_AUTH_FAILED", status: 503 });
    if (response.status === 429) throw Object.assign(new Error("GST verification provider rate limit was reached. Please retry later."), { code: "PROVIDER_RATE_LIMITED", status: 503 });
    if (!response.ok) throw Object.assign(new Error("GST verification provider is temporarily unavailable."), { code: "PROVIDER_ERROR", status: 502 });
    const result = normalizeProviderResponse(gstin, await response.json());
    cache.set(gstin, { value: result, expiresAt: Date.now() + positiveNumber(process.env.GST_LOOKUP_CACHE_TTL_MS, 6 * 60 * 60 * 1000) });
    logger.info("GSTIN lookup completed", { gstinSuffix: gstin.slice(-4), provider: result.provider, status: result.registrationStatus });
    return result;
  } catch (error: any) {
    if (error?.name === "AbortError") throw Object.assign(new Error("GST verification timed out. Please retry."), { code: "PROVIDER_TIMEOUT", status: 504 });
    if (!error?.code) throw Object.assign(new Error("GST verification provider could not be reached."), { code: "PROVIDER_ERROR", status: 502 });
    throw error;
  } finally { clearTimeout(timeout); }
};

export const lookupGstinHandler = async (req: Request, res: Response) => {
  try {
    const result = await lookupGstin(req.body?.gstin);
    const active = isActive(result.registrationStatus);
    return res.status(200).json({ success: true, active, result, verificationProof: active ? createGstinProof(result) : null });
  } catch (error: any) {
    logger.warn("GSTIN lookup failed", { code: error?.code || "UNKNOWN", message: error?.message || "Lookup failed" });
    return res.status(Number(error?.status || 502)).json({ success: false, code: error?.code || "PROVIDER_ERROR", message: error?.message || "GST verification failed." });
  }
};
