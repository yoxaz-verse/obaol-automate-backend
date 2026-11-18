import { describe, expect, it } from "vitest";
import { InventoryReservationModel } from "./inventoryReservation";

describe("inventory reservation duplicate protection", () => {
  it("defines one active reservation per enquiry and an idempotency-key index", () => {
    const indexes = InventoryReservationModel.schema.indexes();
    expect(indexes).toEqual(expect.arrayContaining([
      [{ enquiryId: 1 }, expect.objectContaining({ unique: true, partialFilterExpression: { status: "RESERVED" } })],
      [{ enquiryId: 1, idempotencyKey: 1 }, expect.objectContaining({ unique: true })],
    ]));
  });

  it("stores the request key and payload hash outside default query projections", () => {
    expect(InventoryReservationModel.schema.path("idempotencyKey")?.options.select).toBe(false);
    expect(InventoryReservationModel.schema.path("idempotencyPayloadHash")?.options.select).toBe(false);
  });
});
