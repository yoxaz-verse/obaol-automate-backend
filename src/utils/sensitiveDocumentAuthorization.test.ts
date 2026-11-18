import { describe, expect, it } from "vitest";
import { documentContentHash, sensitiveDocumentPayload } from "./sensitiveDocumentAuthorization";

const doc = { _id: "507f1f77bcf86cd799439011", revision: 2, issueDate: "2026-11-18", selectedTemplateId: "507f1f77bcf86cd799439012", selectedTemplateVersion: 3, documentData: { authorizedSignatory: "A" }, buyer: { name: "Buyer", email: "buyer@example.com" }, seller: { name: "Seller" }, lineItems: [{ description: "Rice", quantity: 5, unitPrice: 10 }], totals: { grandTotal: 50 }, terms: { paymentTerms: "Advance" } };

describe("sensitive document authorization", () => {
  it("produces a stable SHA-256 hash for equivalent document content", () => {
    expect(documentContentHash(doc)).toMatch(/^[a-f0-9]{64}$/);
    expect(documentContentHash({ ...doc, auditEvents: [{ action: "VIEWED" }], updatedAt: new Date() })).toBe(documentContentHash(doc));
  });
  it("invalidates authorization when final content changes", () => {
    expect(documentContentHash({ ...doc, totals: { grandTotal: 51 } })).not.toBe(documentContentHash(doc));
  });
  it("binds normalized recipients, channel, and signature version", () => {
    const payload = sensitiveDocumentPayload("DOCUMENT_EMAIL", doc, { recipient: " Buyer@Example.com ", cc: ["Z@example.com", "a@example.com"], channel: "EMAIL", signatureId: "sig", signatureVersion: 4, signatureChecksum: "abc" });
    expect(payload).toMatchObject({ documentVersion: 2, recipient: "buyer@example.com", cc: ["a@example.com", "z@example.com"], channel: "EMAIL", signatureVersion: 4, signatureChecksum: "abc" });
  });
});
