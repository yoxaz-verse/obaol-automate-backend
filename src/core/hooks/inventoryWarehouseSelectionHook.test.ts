import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./inventoryWarehouseSelectionHook.ts", import.meta.url),
  "utf8"
);

describe("inventory warehouse ownership contract", () => {
  it("requires MY warehouse selections to match the inventory company", () => {
    expect(source).toContain('let expectedCompanyId = String(nextPayload.associateCompany || "").trim()');
    expect(source).toContain('if (location === "MY")');
    expect(source).toContain('String((warehouse as any).ownerCompanyId || "") !== expectedCompanyId');
  });

  it("uses the authenticated associate company instead of a client-supplied company", () => {
    expect(source).toContain("expectedCompanyId = companyId");
  });
});
