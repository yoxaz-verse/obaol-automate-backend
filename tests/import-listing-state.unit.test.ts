import { describe, expect, it } from "vitest";
import { resolveImportListingAvailabilityStatus } from "../src/utils/importListingState";

describe("import listing availability status", () => {
  it.each([
    [100, 0],
    [60, 40],
    [0, 100],
  ])(
    "keeps a closed listing terminal when availability changes to %s with %s reserved",
    (availableQuantity, reservedQuantity) => {
      expect(
        resolveImportListingAvailabilityStatus("CLOSED", availableQuantity, reservedQuantity)
      ).toBe("CLOSED");
    }
  );

  it.each([
    ["OPEN", 100, 0, "OPEN"],
    ["OPEN", 60, 40, "PARTIAL"],
    ["PARTIAL", 0, 100, "FULL"],
    ["FULL", 25, 75, "PARTIAL"],
    ["FULL", 100, 0, "OPEN"],
  ] as const)(
    "recomputes active listing %s with %s available and %s reserved as %s",
    (currentStatus, availableQuantity, reservedQuantity, expectedStatus) => {
      expect(
        resolveImportListingAvailabilityStatus(
          currentStatus,
          availableQuantity,
          reservedQuantity
        )
      ).toBe(expectedStatus);
    }
  );
});
