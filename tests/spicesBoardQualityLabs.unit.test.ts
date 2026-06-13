import { describe, expect, it } from "vitest";
import { spicesBoardQualityLabs } from "../src/data/spicesBoardQualityLabs";

describe("spicesBoardQualityLabs seed data", () => {
  it("contains the full Spice Board QEL plus empanelled lab set", () => {
    expect(spicesBoardQualityLabs).toHaveLength(29);
    expect(spicesBoardQualityLabs.filter((lab) => lab.source === "SPICES_BOARD_QEL")).toHaveLength(9);
    expect(spicesBoardQualityLabs.filter((lab) => lab.source === "SPICES_BOARD_EMPANELLED")).toHaveLength(20);
  });

  it("does not publish fake contact phones for source records without phones", () => {
    const empanelledLabs = spicesBoardQualityLabs.filter((lab) => lab.source === "SPICES_BOARD_EMPANELLED");
    expect(empanelledLabs.every((lab) => !lab.contactPhone && !lab.contactPhoneSecondary)).toBe(true);
  });

  it("has mappable coordinates for every seeded listing", () => {
    expect(
      spicesBoardQualityLabs.every((lab) => {
        const { latitude, longitude } = lab.location;
        return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
      })
    ).toBe(true);
  });
});
