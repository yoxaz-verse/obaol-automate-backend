import { afterEach, describe, expect, it } from "vitest";
import { decryptEWayCredentials, encryptEWayCredentials, validateEWayDraft } from "./eWayBillService";

const originalKey = process.env.EWAY_CREDENTIAL_ENCRYPTION_KEY;
afterEach(() => { if (originalKey === undefined) delete process.env.EWAY_CREDENTIAL_ENCRYPTION_KEY; else process.env.EWAY_CREDENTIAL_ENCRYPTION_KEY = originalKey; });

const validDraft = () => ({
  supplyType: "OUTWARD", subSupplyType: "SUPPLY", document: { type: "TAX_INVOICE", number: "INV-1", date: "2026-11-04" },
  from: { gstin: "29ABCDE1234F1Z5", pincode: "560001" }, to: { gstin: "URP", pincode: "682001" },
  items: [{ description: "Pepper", hsnCode: "0904", quantity: 10, taxableValue: 50000 }], totalInvoiceValue: 50000,
  transport: { mode: "ROAD", distanceKm: 500, vehicleNumber: "KA01AB1234" },
});

describe("e-way bill service", () => {
  it("accepts a complete GST movement payload", () => expect(validateEWayDraft(validDraft())).toEqual([]));
  it("returns field-addressable readiness errors", () => {
    const draft = validDraft(); draft.from.gstin = "bad"; draft.transport.distanceKm = 0; draft.items = [] as any;
    expect(validateEWayDraft(draft).map(error => error.path)).toEqual(expect.arrayContaining(["from.gstin", "items", "transport.distanceKm"]));
  });
  it("encrypts credentials with authenticated encryption", () => {
    process.env.EWAY_CREDENTIAL_ENCRYPTION_KEY = "test-only-key";
    const encrypted = encryptEWayCredentials({ clientId: "id", clientSecret: "secret" });
    expect(encrypted).not.toContain("secret");
    expect(decryptEWayCredentials(encrypted)).toEqual({ clientId: "id", clientSecret: "secret" });
  });
});
