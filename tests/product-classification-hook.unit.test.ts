import { describe, expect, it } from "vitest";

import { productClassificationPreReadHook, productClassificationPreWriteHook } from "../src/core/hooks/productClassificationHook";

const methodPayloads = {
  conventional: { isConventional: true, isNatural: false, isOrganic: false, isIpmQuality: false },
  natural: { isConventional: false, isNatural: true, isOrganic: false, isIpmQuality: false },
  ipm: { isConventional: false, isNatural: false, isOrganic: false, isIpmQuality: true },
};

describe("product classification write hook", () => {
  for (const [method, flags] of Object.entries(methodPayloads)) {
    it(`accepts ${method} with GI Tag independently enabled`, async () => {
      const result = await productClassificationPreWriteHook({
        ...flags,
        isGiTagged: true,
        giName: "Example GI",
        giCertificateNumber: "GI-123",
      } as any, undefined as any, undefined, undefined as any);

      expect(result).toMatchObject({ ...flags, isGiTagged: true });
    });
  }

  it("accepts organic with its required certification details and GI Tag", async () => {
    const result = await productClassificationPreWriteHook({
      isConventional: false,
      isNatural: false,
      isOrganic: true,
      isIpmQuality: false,
      organicCertificationBody: "APEDA_NPOP",
      organicCertificateNumber: "ORG-123",
      organicCertificateValidFrom: "2026-01-01",
      organicCertificateValidTo: "2026-12-31",
      organicCertifiedQuantity: 10,
      isGiTagged: true,
      giName: "Example GI",
      giCertificateNumber: "GI-123",
    } as any, undefined as any, undefined, undefined as any);

    expect(result).toMatchObject({ isOrganic: true, isOrganicCertified: true, isGiTagged: true });
  });

  it("maps the legacy all-false method shape to conventional", async () => {
    const result = await productClassificationPreWriteHook({
      isNatural: false,
      isOrganic: false,
      isIpmQuality: false,
      isGiTagged: false,
    } as any, undefined as any, undefined, undefined as any);

    expect(result).toMatchObject({ isConventional: true, isGiTagged: false });
  });

  it("rejects multiple production methods", async () => {
    await expect(productClassificationPreWriteHook({
      isConventional: false,
      isNatural: true,
      isOrganic: true,
      isIpmQuality: false,
    } as any, undefined as any, undefined, undefined as any)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects an explicit payload with no production method", async () => {
    await expect(productClassificationPreWriteHook({
      isConventional: false,
      isNatural: false,
      isOrganic: false,
      isIpmQuality: false,
    } as any, undefined as any, undefined, undefined as any)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("product classification read hook", () => {
  it("keeps Natural results separate from conflicting legacy IPM rows", async () => {
    const result = await productClassificationPreReadHook(
      { classifications: ["natural"] } as any,
      undefined as any,
      undefined,
      undefined as any,
    );

    expect(result).toEqual({
      isNatural: true,
      isOrganic: { $ne: true },
      isIpmQuality: { $ne: true },
    });
  });

  it("treats a conflicting legacy IPM row as IPM", async () => {
    const result = await productClassificationPreReadHook(
      { classifications: ["ipm"] } as any,
      undefined as any,
      undefined,
      undefined as any,
    );

    expect(result).toEqual({ isIpmQuality: true });
  });
});
