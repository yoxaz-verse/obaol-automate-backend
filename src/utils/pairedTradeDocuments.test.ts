import { describe, expect, it } from "vitest";
import { audienceScopeForDirection, isCompleteDocumentPair, PAIRED_TRADE_DOCUMENT_DIRECTIONS } from "./pairedTradeDocuments";

describe("paired trade documents", () => {
  it("uses the commercial direction required for each supported type", () => {
    expect(PAIRED_TRADE_DOCUMENT_DIRECTIONS.LOI).toEqual(["BUYER_TO_OBAOL", "OBAOL_TO_SELLER"]);
    expect(PAIRED_TRADE_DOCUMENT_DIRECTIONS.PURCHASE_ORDER).toEqual(["BUYER_TO_OBAOL", "OBAOL_TO_SELLER"]);
    expect(PAIRED_TRADE_DOCUMENT_DIRECTIONS.QUOTATION).toEqual(["SELLER_TO_OBAOL", "OBAOL_TO_BUYER"]);
    expect(PAIRED_TRADE_DOCUMENT_DIRECTIONS.PROFORMA_INVOICE).toEqual(["SELLER_TO_OBAOL", "OBAOL_TO_BUYER"]);
  });

  it("maps each direction to the party-specific visibility scope", () => {
    expect(audienceScopeForDirection("BUYER_TO_OBAOL")).toBe("OBAOL_BUYER");
    expect(audienceScopeForDirection("OBAOL_TO_BUYER")).toBe("OBAOL_BUYER");
    expect(audienceScopeForDirection("SELLER_TO_OBAOL")).toBe("SELLER_OBAOL");
    expect(audienceScopeForDirection("OBAOL_TO_SELLER")).toBe("SELLER_OBAOL");
  });

  it("does not complete a workflow until both legs are issued", () => {
    expect(isCompleteDocumentPair("LOI", [{ direction: "BUYER_TO_OBAOL", status: "SENT" }, { direction: "OBAOL_TO_SELLER", status: "DRAFT" }])).toBe(false);
    expect(isCompleteDocumentPair("LOI", [{ direction: "BUYER_TO_OBAOL", status: "SENT" }, { direction: "OBAOL_TO_SELLER", status: "SENT" }])).toBe(true);
  });
});
