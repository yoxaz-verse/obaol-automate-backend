import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGstinLookupCache, createGstinProof, lookupGstin, lookupGstinHandler, verifyGstinProof } from "./gstinLookupService";

const gstin = "27AAPFU0939F1ZV";
const providerBody = {
  data: {
    legalName: "Example Private Limited",
    tradeName: "Example",
    registrationStatus: "ACTIVE",
    registrationDate: "01/07/2017",
    constitution: "Private Limited Company",
    taxpayerType: "Regular",
    registeredAddress: "Mumbai, Maharashtra 400001",
    stateCode: "27",
    businessActivities: ["Wholesale Business"],
  },
  referenceId: "lookup-1",
};

describe("GSTIN lookup service", () => {
  beforeEach(() => {
    clearGstinLookupCache();
    process.env.GST_LOOKUP_URL = "https://provider.test/gstin/{gstin}";
    process.env.GST_LOOKUP_API_KEY = "secret-key";
    process.env.GST_LOOKUP_PROOF_SECRET = "proof-secret";
    process.env.GST_LOOKUP_PROVIDER = "test-provider";
    process.env.GST_LOOKUP_METHOD = "GET";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GST_LOOKUP_URL;
    delete process.env.GST_LOOKUP_API_KEY;
    delete process.env.GST_LOOKUP_PROOF_SECRET;
    delete process.env.GST_LOOKUP_METHOD;
    delete process.env.GST_LOOKUP_API_KEY_PREFIX;
    delete process.env.GST_LOOKUP_BODY_TEMPLATE;
    delete process.env.GST_LOOKUP_TIMEOUT_MS;
  });

  it("rejects format and checksum failures without calling the provider", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(lookupGstin("27AAPFU0939F1ZW")).rejects.toMatchObject({ code: "INVALID_GSTIN", status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes provider data, caches it, and creates a bound proof", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(providerBody), { status: 200 }));
    const result = await lookupGstin(gstin);
    expect(result).toMatchObject({ gstin, legalName: "Example Private Limited", registrationStatus: "ACTIVE", provider: "test-provider" });
    expect((await lookupGstin(gstin)).legalName).toBe(result.legalName);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const proof = createGstinProof(result);
    expect(verifyGstinProof(proof, gstin)?.legalName).toBe(result.legalName);
    expect(verifyGstinProof(proof, "27AAPFU0939F1ZW")).toBeNull();
  });

  it("reports unavailable, not-found, and malformed-provider conditions", async () => {
    delete process.env.GST_LOOKUP_URL;
    await expect(lookupGstin(gstin)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE", status: 503 });
    process.env.GST_LOOKUP_URL = "https://provider.test/{gstin}";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 404 })).mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: "ACTIVE" } }), { status: 200 }));
    await expect(lookupGstin(gstin)).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    await expect(lookupGstin(gstin)).rejects.toMatchObject({ code: "MALFORMED_PROVIDER_RESPONSE" });
  });

  it("does not issue an active proof for non-active registrations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ...providerBody, data: { ...providerBody.data, registrationStatus: "CANCELLED" } }), { status: 200 }));
    const result = await lookupGstin(gstin);
    expect(result.registrationStatus).toBe("CANCELLED");
  });

  it("supports JSON POST providers and bearer API keys", async () => {
    process.env.GST_LOOKUP_URL = "https://provider.test/taxpayer/search";
    process.env.GST_LOOKUP_METHOD = "POST";
    process.env.GST_LOOKUP_API_KEY_PREFIX = "Bearer";
    process.env.GST_LOOKUP_BODY_TEMPLATE = '{"taxpayerId":"{gstin}"}';
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(providerBody), { status: 200 }));

    await lookupGstin(gstin);

    expect(fetchMock).toHaveBeenCalledWith("https://provider.test/taxpayer/search", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer secret-key", "Content-Type": "application/json" }),
      body: JSON.stringify({ taxpayerId: gstin }),
    }));
  });

  it.each([
    [401, "PROVIDER_AUTH_FAILED"],
    [403, "PROVIDER_AUTH_FAILED"],
    [429, "PROVIDER_RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ])("maps provider HTTP %i without exposing its response", async (status, code) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("provider secret detail", { status }));
    await expect(lookupGstin(gstin)).rejects.toMatchObject({ code });
  });

  it("maps provider timeout and network failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }))
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED secret.internal"));
    await expect(lookupGstin(gstin)).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT", status: 504 });
    await expect(lookupGstin(gstin)).rejects.toMatchObject({ code: "PROVIDER_ERROR", status: 502, message: "GST verification provider could not be reached." });
  });

  it("rejects an invalid POST body template before contacting the provider", async () => {
    process.env.GST_LOOKUP_METHOD = "POST";
    process.env.GST_LOOKUP_BODY_TEMPLATE = "not-json";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(lookupGstin(gstin)).rejects.toMatchObject({ code: "PROVIDER_CONFIGURATION_ERROR", status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a proof only for active registrations", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(providerBody), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...providerBody, data: { ...providerBody.data, registrationStatus: "CANCELLED" } }), { status: 200 }));
    const response = () => {
      const res: any = { statusCode: 200, payload: undefined };
      res.status = vi.fn((status: number) => { res.statusCode = status; return res; });
      res.json = vi.fn((payload: unknown) => { res.payload = payload; return res; });
      return res;
    };

    const activeResponse = response();
    await lookupGstinHandler({ body: { gstin } } as any, activeResponse);
    expect(activeResponse.payload).toMatchObject({ success: true, active: true });
    expect(activeResponse.payload.verificationProof).toEqual(expect.any(String));

    clearGstinLookupCache();
    const cancelledResponse = response();
    await lookupGstinHandler({ body: { gstin } } as any, cancelledResponse);
    expect(cancelledResponse.payload).toMatchObject({ success: true, active: false, verificationProof: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
