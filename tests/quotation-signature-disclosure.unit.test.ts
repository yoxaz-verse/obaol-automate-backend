import { describe, expect, it } from "vitest";
import { buildQuotationSignatureWarning, MissingQuotationSignature } from "../src/utils/quotationSignatureDisclosure";

const missingSignatures: MissingQuotationSignature[] = [
  { leg: "SELLER_TO_OBAOL", companyId: "meridian", companyName: "Meridian Agri-Exports" },
  { leg: "OBAOL_TO_BUYER", companyId: "obaol", companyName: "OBAOL Supreme" },
];

const warning = (overrides: Record<string, unknown> = {}) => buildQuotationSignatureWarning({
  viewerRole: "Associate",
  viewerCompanyId: "meridian",
  sellerCompanyId: "meridian",
  sellerRegistrationStatus: "APPROVED",
  sellerIsDeleted: false,
  missingSignatures,
  ...overrides,
});

describe("quotation signature warning disclosure", () => {
  it("shows signature details to an associate in the verified seller company", () => {
    expect(warning()).toEqual({
      message: "Meridian Agri-Exports and OBAOL Supreme must configure an authorized document signature before the quotation can be issued.",
      missingSignatures,
    });
  });

  it.each([
    ["buyer company", { viewerCompanyId: "buyer" }],
    ["admin", { viewerRole: "Admin" }],
    ["operator", { viewerRole: "Operator" }],
    ["unverified seller", { sellerRegistrationStatus: "PENDING" }],
    ["deleted seller", { sellerIsDeleted: true }],
  ])("hides signature details from %s", (_label, overrides) => {
    expect(warning(overrides)).toBeNull();
  });

  it("does not create a warning when signatures are configured", () => {
    expect(warning({ missingSignatures: [] })).toBeNull();
  });
});
