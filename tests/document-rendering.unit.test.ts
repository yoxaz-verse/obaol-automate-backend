import { describe, expect, it } from "vitest";
import { renderDocumentHtml } from "../src/services/documentRenderService";
import { ensureDefaultDocumentTemplate } from "../src/utils/documentTemplates";
import { DocumentTemplateModel } from "../src/database/models/documentTemplate";

const document = {
  type: "INVOICE", status: "DRAFT", documentNumber: "INV-1001", issueDate: "2026-10-28",
  seller: { name: "OBAOL Supreme", address: "Kochappilly Road", email: "seller@example.com" },
  buyer: { name: "Yoxaz Verse", address: "Line one\nLine two", email: "buyer@example.com" },
  lineItems: [{ description: "Lakadong Turmeric", quantity: 1, unit: "KG", unitPrice: 692965.35, taxRate: 0, total: 692965.35 }],
  totals: { currency: "INR", subtotal: 692965.35, taxAmount: 0, discountAmount: 0, grandTotal: 692965.35 },
  terms: { paymentTerms: "Advance\nAgainst invoice", termsAndConditions: "No hidden terms" },
  documentData: { authorizedSignatory: "Director" },
};

describe("canonical document HTML rendering", () => {
  it("preserves Indian currency grouping and multiline content", () => {
    const html = renderDocumentHtml(document, { name: "Classic Standard", version: 2, visualStyle: "CLASSIC", layoutSchema: { elements: [] } });
    expect(html).toContain("INR 6,92,965.35");
    expect(html).toContain("Line one<br>Line two");
    expect(html).toContain("Advance<br>Against invoice");
    expect(html).toContain("Template: Classic Standard, version 2");
  });

  it("uses the same typed variable registry for positioned admin elements", () => {
    const html = renderDocumentHtml(document, { name: "Custom", version: 1, layoutSchema: { elements: [{ id: "total", type: "TEXT", label: "Payable", x: 40, y: 900, width: 250, height: 40, visible: true, binding: { bindingType: "SYSTEM_TOKEN", token: "totals.grandTotal" } }] } });
    expect(html).toContain("class=\"custom-element positioned\"");
    expect(html).toContain("left:40px;top:900px;width:250px");
    expect(html).toContain("Payable</strong>: INR 6,92,965.35");
  });

  it("assigns purchase-order issuer and recipient in the correct direction", () => {
    const html = renderDocumentHtml({ ...document, type: "PURCHASE_ORDER" }, { name: "Classic", version: 1, layoutSchema: { elements: [] } });
    expect(html.indexOf("Yoxaz Verse")).toBeLessThan(html.indexOf("OBAOL Supreme"));
  });

  it("renders the immutable issuer signature snapshot", () => {
    const html = renderDocumentHtml({ ...document, issuerSignatureSnapshot: { imageDataUrl: "data:image/png;base64,c2ln", signerName: "Asha Rao", signerDesignation: "Director" } }, { name: "Classic", version: 1, layoutSchema: { elements: [] } });
    expect(html).toContain("data:image/png;base64,c2ln");
    expect(html).toContain("Asha Rao");
    expect(html).toContain("Director");
  });

  it("leaves missing document values blank instead of rendering dash placeholders", () => {
    const html = renderDocumentHtml({ ...document, buyer: {}, seller: {}, documentData: {}, terms: {} }, { name: "Classic", version: 1, layoutSchema: { elements: [] } });
    expect(html).not.toContain(">—<");
    expect(html).not.toContain(">-<");
  });

  it("renders a dedicated Bill of Lading draft with carrier warning and cargo particulars", () => {
    const html = renderDocumentHtml({ ...document, type: "BILL_OF_LADING", sourceMode: "CREATED", documentData: { shipper: "OBAOL Exporter", consignee: "Overseas Buyer", billNumber: "BL-100", carrier: "Ocean Line", vessel: "MV Trade / 12", portOfLoading: "Cochin", portOfDischarge: "Dubai", cargoDescription: "Bagged cardamom", totalGrossWeight: 1200, packages: [{ description: "Cardamom", packageType: "Bag", packageCount: 40, grossWeight: 1200, netWeight: 1160, marks: "OBL" }], issuePlace: "Cochin", transportIssueDate: "2026-11-04", authorizedSignatory: "Carrier Agent" } }, { name: "Trade", version: 1, layoutSchema: { elements: [] } });
    expect(html).toContain("DRAFT — NOT CARRIER ISSUED");
    expect(html).toContain("Ocean carriage particulars");
    expect(html).toContain("MV Trade / 12");
    expect(html).toContain("Bagged cardamom");
  });

  it("renders a dedicated Air Waybill without a draft warning for an uploaded original", () => {
    const html = renderDocumentHtml({ ...document, type: "AIR_WAYBILL", sourceMode: "UPLOADED", documentData: { shipper: "OBAOL Exporter", consignee: "Overseas Buyer", issuingCarrierAgent: "Cargo Agent", airWaybillNumber: "098-12345675", carrier: "Air Cargo", originAirport: "COK", destinationAirport: "DXB", cargoDescription: "Fresh produce", chargeableWeight: 500, packages: [], issuePlace: "Cochin", transportIssueDate: "2026-11-04", authorizedSignatory: "Airline Agent" } }, { name: "Trade", version: 1, layoutSchema: { elements: [] } });
    expect(html).toContain("Air carriage particulars");
    expect(html).toContain("098-12345675");
    expect(html).not.toContain("DRAFT — NOT CARRIER ISSUED");
  });
});

describe("dynamic document template presets", () => {
  it("creates exactly three published variants idempotently", async () => {
    await ensureDefaultDocumentTemplate("INVOICE");
    await ensureDefaultDocumentTemplate("INVOICE");
    const rows = await DocumentTemplateModel.find({ documentType: "INVOICE", scope: "GLOBAL", stage: "LIVE", isDeleted: { $ne: true } }).lean();
    expect(rows).toHaveLength(3);
    expect(rows.map((row: any) => row.name).sort()).toEqual(["Classic Standard", "Compact Trade", "Modern Business"]);
    expect(rows.filter((row: any) => row.isDefault)).toHaveLength(1);
  });
});
