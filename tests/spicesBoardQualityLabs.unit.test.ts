import { describe, expect, it } from "vitest";
import { SPICES_BOARD_QEL_URL, spicesBoardQualityLabs } from "../src/data/spicesBoardQualityLabs";

describe("spicesBoardQualityLabs seed data", () => {
  it("contains the full Spice Board QEL plus empanelled lab set", () => {
    expect(spicesBoardQualityLabs).toHaveLength(29);
    expect(spicesBoardQualityLabs.filter((lab) => lab.source === "SPICES_BOARD_QEL")).toHaveLength(9);
    expect(spicesBoardQualityLabs.filter((lab) => lab.source === "SPICES_BOARD_EMPANELLED")).toHaveLength(20);
  });

  it("keeps QEL phone provenance tied to the official Spices Board page", () => {
    const qelLabs = spicesBoardQualityLabs.filter((lab) => lab.source === "SPICES_BOARD_QEL");
    expect(qelLabs.every((lab) => lab.contactPhone && lab.contactSourceUrl === SPICES_BOARD_QEL_URL)).toBe(true);
  });

  it("requires official contact provenance for every empanelled phone", () => {
    const empanelledLabs = spicesBoardQualityLabs.filter((lab) => lab.source === "SPICES_BOARD_EMPANELLED");
    const labsWithPhones = empanelledLabs.filter((lab) => lab.contactPhone || lab.contactPhoneSecondary);

    expect(labsWithPhones.length).toBeGreaterThan(0);
    expect(
      labsWithPhones.every((lab) => lab.contactSourceUrl && lab.contactSourceLabel && lab.contactVerifiedAt)
    ).toBe(true);
  });

  it("leaves empanelled labs blank when no official phone source is verified", () => {
    const empanelledLabs = spicesBoardQualityLabs.filter((lab) => lab.source === "SPICES_BOARD_EMPANELLED");
    const labsWithoutPhones = empanelledLabs.filter((lab) => !lab.contactPhone && !lab.contactPhoneSecondary);

    expect(labsWithoutPhones.length).toBeGreaterThan(0);
    expect(labsWithoutPhones.every((lab) => !lab.contactSourceUrl && !lab.contactSourceLabel)).toBe(true);
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
