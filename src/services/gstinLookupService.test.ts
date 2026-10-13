import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGstinLookupCache, createGstinProof, lookupGstin, verifyGstinProof } from "./gstinLookupService";

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GST_LOOKUP_URL;
    delete process.env.GST_LOOKUP_API_KEY;
    delete process.env.GST_LOOKUP_PROOF_SECRET;
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
});
