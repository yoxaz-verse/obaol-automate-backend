import { describe, expect, it } from "vitest";
import { parseDocumentFields } from "../src/services/documentExtractionService";

describe("self-hosted document extraction normalization", () => {
  it("maps common trade-document labels into review fields", () => {
    const fields = parseDocumentFields(`Invoice No: INV-204\nIssue Date: 25/10/2026\nSeller: Acme Exports\nBuyer: Global Foods\nIncoterm FOB\nGrand Total INR 12,450.50`);
    const values = Object.fromEntries(fields.map((row: any) => [row.key, row.value]));
    expect(values.documentNumber).toBe("INV-204");
    expect(values["seller.name"]).toBe("Acme Exports");
    expect(values["buyer.name"]).toBe("Global Foods");
    expect(values["terms.incotermCode"]).toBe("FOB");
    expect(values["totals.grandTotal"]).toBe(12450.5);
  });

  it("returns no fabricated values for unknown text", () => {
    expect(parseDocumentFields("unstructured unreadable scan")).toEqual([]);
  });
});
