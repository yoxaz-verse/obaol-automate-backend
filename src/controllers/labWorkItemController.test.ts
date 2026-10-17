import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { isValidLabCustodyTransition, LabWorkItemController } from "./labWorkItemController";
import { LabWorkItemModel } from "../database/models/labWorkItem";

const response = () => {
  const state: { status: number; body?: any } = { status: 200 };
  const res: any = { status(code: number) { state.status = code; return res; }, json(body: any) { state.body = body; return res; } };
  return { res, state };
};
const labWorkItemController = new LabWorkItemController();

describe("lab sample custody transitions", () => {
  it("allows only the forward custody sequence", () => {
    expect(isValidLabCustodyTransition("EXPECTED", "RECEIVED")).toBe(true);
    expect(isValidLabCustodyTransition("RECEIVED", "TESTING")).toBe(true);
    expect(isValidLabCustodyTransition("TESTING", "COMPLETED")).toBe(true);
    expect(isValidLabCustodyTransition("COMPLETED", "RELEASED")).toBe(true);
  });

  it("rejects skipped, reversed, and terminal transitions", () => {
    expect(isValidLabCustodyTransition("EXPECTED", "TESTING")).toBe(false);
    expect(isValidLabCustodyTransition("TESTING", "RECEIVED")).toBe(false);
    expect(isValidLabCustodyTransition("RELEASED", "EXPECTED")).toBe(false);
  });

  it("records the actor, timestamp, and note for an authorized transition", async () => {
    const actor = new Types.ObjectId();
    const item: any = await LabWorkItemModel.create({ inquiryId: new Types.ObjectId(), executionTaskId: new Types.ObjectId(), labCompanyId: new Types.ObjectId(), status: "EXPECTED", createdBy: actor, updatedBy: actor });
    const output = response();
    await labWorkItemController.transition({ params: { id: String(item._id) }, body: { status: "RECEIVED", note: "Seal intact" }, user: { id: String(actor), role: "Admin" } } as any, output.res);
    expect(output.state.status).toBe(200);
    expect(output.state.body.data.status).toBe("RECEIVED");
    expect(output.state.body.data.receivedAt).toBeTruthy();
    expect(output.state.body.data.statusHistory[0]).toMatchObject({ status: "RECEIVED", note: "Seal intact" });
  });

  it("allows only one of two concurrent custody transitions", async () => {
    const actor = new Types.ObjectId();
    const item: any = await LabWorkItemModel.create({ inquiryId: new Types.ObjectId(), executionTaskId: new Types.ObjectId(), labCompanyId: new Types.ObjectId(), status: "EXPECTED", createdBy: actor, updatedBy: actor });
    const first = response(); const second = response();
    await Promise.all([
      labWorkItemController.transition({ params: { id: String(item._id) }, body: { status: "RECEIVED" }, user: { id: String(actor), role: "Admin" } } as any, first.res),
      labWorkItemController.transition({ params: { id: String(item._id) }, body: { status: "RECEIVED" }, user: { id: String(actor), role: "Admin" } } as any, second.res),
    ]);
    expect([first.state.status, second.state.status].sort()).toEqual([200, 409]);
    const stored: any = await LabWorkItemModel.findById(item._id).lean();
    expect(stored.statusHistory).toHaveLength(1);
  });

  it("rejects invalid identifiers and oversized custody notes", async () => {
    const invalid = response();
    await labWorkItemController.transition({ params: { id: "invalid" }, body: { status: "RECEIVED" }, user: { id: String(new Types.ObjectId()), role: "Admin" } } as any, invalid.res);
    expect(invalid.state.status).toBe(400);

    const actor = new Types.ObjectId();
    const item: any = await LabWorkItemModel.create({ inquiryId: new Types.ObjectId(), executionTaskId: new Types.ObjectId(), labCompanyId: new Types.ObjectId(), status: "EXPECTED", createdBy: actor, updatedBy: actor });
    const oversized = response();
    await labWorkItemController.transition({ params: { id: String(item._id) }, body: { status: "RECEIVED", note: "x".repeat(1001) }, user: { id: String(actor), role: "Admin" } } as any, oversized.res);
    expect(oversized.state.status).toBe(400);
  });
});
