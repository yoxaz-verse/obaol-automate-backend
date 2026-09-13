import { describe, expect, it } from "vitest";
import { OrderModel } from "../src/database/models/order";

describe("Order indexes", () => {
  it("does not declare the same index more than once", () => {
    const signatures = OrderModel.schema.indexes().map(([fields]) => JSON.stringify(fields));
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it("retains external-order lookup indexes", () => {
    const fields = OrderModel.schema.indexes().map(([indexFields]) => indexFields);
    expect(fields).toContainEqual({ isExternal: 1 });
    expect(fields).toContainEqual({ externalCreatedBy: 1 });
  });
});
