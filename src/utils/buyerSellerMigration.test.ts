import { describe, expect, it } from "vitest";
import { migrateBuyerSellerProfile } from "./buyerSellerMigration";

const ids = {
  legacyBuyerId: "old-buyer",
  legacySellerId: "old-seller",
  buyerId: "new-buyer",
  sellerId: "new-seller",
};

describe("Buyer/Seller taxonomy migration", () => {
  it("renames provided roles directly and inverts sought counterparty roles", () => {
    expect(migrateBuyerSellerProfile({
      providedCapabilities: ["buying", "selling"],
      soughtCapabilities: ["buying", "selling"],
      providedCapabilityPriorities: ["old-buyer", "old-seller"],
      soughtCapabilityPriorities: ["old-buyer", "old-seller"],
    }, ids)).toEqual({
      providedCapabilities: ["buyer", "seller"],
      soughtCapabilities: ["seller", "buyer"],
      providedCapabilityPriorities: ["new-buyer", "new-seller"],
      soughtCapabilityPriorities: ["new-seller", "new-buyer"],
    });
  });

  it("leaves an already migrated profile unchanged", () => {
    const migrated = migrateBuyerSellerProfile({
      providedCapabilities: ["buyer"],
      soughtCapabilities: ["seller"],
      providedCapabilityPriorities: ["new-buyer"],
      soughtCapabilityPriorities: ["new-seller"],
    }, ids);
    expect(migrated).toEqual({
      providedCapabilities: ["buyer"],
      soughtCapabilities: ["seller"],
      providedCapabilityPriorities: ["new-buyer"],
      soughtCapabilityPriorities: ["new-seller"],
    });
  });

  it("deduplicates partially migrated capability and priority values", () => {
    const migrated = migrateBuyerSellerProfile({
      providedCapabilities: ["buying", "buyer"],
      soughtCapabilities: ["selling", "buyer"],
      providedCapabilityPriorities: ["old-buyer", "new-buyer"],
      soughtCapabilityPriorities: ["old-seller", "new-buyer"],
    }, ids);
    expect(migrated.providedCapabilities).toEqual(["buyer"]);
    expect(migrated.soughtCapabilities).toEqual(["buyer"]);
    expect(migrated.providedCapabilityPriorities).toEqual(["new-buyer"]);
    expect(migrated.soughtCapabilityPriorities).toEqual(["new-buyer"]);
  });
});
