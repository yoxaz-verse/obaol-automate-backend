import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { RequirementModel } from "./requirement";

const valid = () => ({
  reference: "REQ-20261116-ABC123",
  mode: "SERVICE_ONLY",
  title: "Move and test a commodity load",
  createdBy: new Types.ObjectId(),
  items: [{
    type: "QUALITY_TESTING",
    title: "Quality / lab testing",
    fulfilmentMethod: "MATCHED_BIDDING",
    specifications: { notes: "Test moisture and residues" },
  }],
});

describe("RequirementModel", () => {
  it("accepts a service-only requirement with selected work", async () => {
    const row = new RequirementModel(valid());
    await expect(row.validate()).resolves.toBeUndefined();
    expect(row.status).toBe("DRAFT");
    expect(row.items[0].status).toBe("DRAFT");
  });

  it("requires at least one supported requirement item", async () => {
    const row = new RequirementModel({ ...valid(), items: [] });
    await expect(row.validate()).rejects.toThrow("At least one requirement item is required");
  });

  it("rejects unsupported service types", async () => {
    const row = new RequirementModel({ ...valid(), items: [{ type: "UNKNOWN", title: "Unknown" }] });
    await expect(row.validate()).rejects.toThrow();
  });
});
