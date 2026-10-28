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
