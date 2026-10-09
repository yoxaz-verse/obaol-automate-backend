import { describe, expect, it } from "vitest";
import { CIN_REGEX, GST_REGEX, IEC_REGEX, normalizeCompanyIdentifier } from "./companyIdentifiers";

describe("company verification identifiers", () => {
  it("normalizes optional values", () => {
    expect(normalizeCompanyIdentifier(" 27aabcu9603r1zm ")).toBe("27AABCU9603R1ZM");
    expect(normalizeCompanyIdentifier(undefined)).toBe("");
  });

  it("validates GSTIN format", () => {
    expect(GST_REGEX.test("27AABCU9603R1ZM")).toBe(true);
    expect(GST_REGEX.test("")).toBe(false);
    expect(GST_REGEX.test("123456789012345")).toBe(false);
  });

  it("validates IEC format", () => {
    expect(IEC_REGEX.test("AABCU9603R")).toBe(true);
    expect(IEC_REGEX.test("1234567890")).toBe(true);
    expect(IEC_REGEX.test("AABCU9603")).toBe(false);
  });

  it("validates CIN format", () => {
    expect(CIN_REGEX.test("L17110MH1973PLC019786")).toBe(true);
    expect(CIN_REGEX.test("U72900KA2020PTC123456")).toBe(true);
    expect(CIN_REGEX.test("L17110MH1973PLC01978")).toBe(false);
  });
});
