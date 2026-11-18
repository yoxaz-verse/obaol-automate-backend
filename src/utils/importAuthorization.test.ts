import { describe, expect, it } from "vitest";
import { canCompanyCreateImportListing, hasImporterCompanyCapability } from "./importAuthorization";

describe("import listing company authorization", () => {
  it.each([
    [["importing-to-india"]],
    [["IMPORTING-TO-INDIA"]],
    [["IMPORTING_TO_INDIA"]],
    [["IMPORTING_DISTRIBUTION"]],
  ])("recognizes normalized and legacy importer capabilities", (capabilities) => {
    expect(hasImporterCompanyCapability(capabilities)).toBe(true);
  });

  it.each([undefined, null, [], ["seller"], ["exporting-from-india"]])(
    "does not authorize a company without importer capability",
    (capabilities) => {
      expect(hasImporterCompanyCapability(capabilities)).toBe(false);
    }
  );

  it("keeps a valid company-function mapping as a compatibility fallback", () => {
    expect(canCompanyCreateImportListing(["seller"], true)).toBe(true);
  });

  it("rejects a company with neither importer capability source", () => {
    expect(canCompanyCreateImportListing(["seller"], false)).toBe(false);
  });
});
