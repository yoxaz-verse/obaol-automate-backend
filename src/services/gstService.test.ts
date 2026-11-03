import { describe, expect, it } from "vitest";
import { computeTax, periodRange, roundMoney, MockGstProvider } from "./gstService";

describe("GST service", () => {
  it("splits intra-state GST evenly", () => {
    expect(computeTax(1000, 18, "27", "27")).toEqual({ taxableValue: 1000, cgst: 90, sgst: 90, igst: 0, cess: 0 });
  });

  it("uses IGST for inter-state supply and rounds currency", () => {
    expect(computeTax(999.99, 18, "27", "29")).toEqual({ taxableValue: 999.99, cgst: 0, sgst: 0, igst: 180, cess: 0 });
    expect(roundMoney(1.005)).toBe(1.01);
  });

  it("parses MMYYYY periods and rejects invalid months", () => {
    const range = periodRange("042026");
    expect(range.start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(() => periodRange("132026")).toThrow("Invalid GST period");
  });

  it("implements deterministic sandbox OTP behavior", async () => {
    const provider = new MockGstProvider();
    await expect(provider.verify({}, "123")).rejects.toMatchObject({ code: "INVALID_OTP" });
    await expect(provider.verify({}, "123456")).resolves.toMatchObject({ status: "FILED" });
  });
});
