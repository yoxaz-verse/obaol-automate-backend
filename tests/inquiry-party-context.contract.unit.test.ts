import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("anonymous inquiry party context", () => {
  it("returns sanitized party locations after access filtering", () => {
    const controller = read("src/controllers/InquiryController.ts");
    expect(controller).toContain("const filteredInquiry = filterInquiryFields");
    expect(controller).toContain("data: { ...filteredInquiry, partyLocations }");
    expect(controller).toContain('label: [district, state].filter(Boolean).join(", ") || "Location not provided"');
  });

  it("derives trade-input attribution from the authenticated actor", () => {
    const controller = read("src/controllers/InquiryController.ts");
    const model = read("src/database/models/enquiry.ts");
    expect(controller).toContain("this.tradeInputContributor(req, inquiry)");
    expect(controller).not.toContain("req.body.tradeInputAttribution");
    expect(model).toContain("tradeInputAttribution");
    expect(model).toContain('enum: ["BUYER", "SELLER", "OBAOL"]');
  });
});
