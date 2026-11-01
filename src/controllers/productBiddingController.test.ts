import { afterEach, describe, expect, it, vi } from "vitest";
import { productBiddingController, validateProductBiddingSchedule } from "./productBiddingController";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateModel } from "../database/models/associate";

describe("product bidding schedule validation", () => {
  const open = "2099-10-20T10:00:00.000Z";
  const close = "2099-10-20T12:00:00.000Z";
  const delivery = "2099-10-21T00:00:00.000Z";

  it("accepts an ordered opening, closing, and delivery timeline", () => {
    expect(validateProductBiddingSchedule(open, close, delivery)).toBeNull();
  });

  it("rejects a closing time that is not after opening", () => {
    expect(validateProductBiddingSchedule(open, open, delivery)).toBe("Closing time must be after opening time.");
  });

  it("requires a delivery date", () => {
    expect(validateProductBiddingSchedule(open, close, null)).toBe("A valid delivery date is required.");
  });

  it("rejects delivery that is not after closing", () => {
    expect(validateProductBiddingSchedule(open, close, close)).toBe("Delivery date must be after the closing date.");
  });
});

const response = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};
const leanResult = (value: any) => ({ select: vi.fn(() => ({ lean: vi.fn(async () => value) })) });

describe("admin buying request ownership", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requires an explicit company and approved contact", async () => {
    const res = response();
    await productBiddingController.create({ user: { id: "507f1f77bcf86cd799439011", role: "admin" }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Select a buyer company and approved buyer contact." }));
  });

  it("rejects a contact that does not belong to the selected company", async () => {
    vi.spyOn(AssociateCompanyModel, "findOne").mockReturnValue(leanResult({ _id: "507f1f77bcf86cd799439012" }) as any);
    vi.spyOn(AssociateModel, "findOne").mockReturnValue(leanResult(null) as any);
    const res = response();
    await productBiddingController.create({
      user: { id: "507f1f77bcf86cd799439011", role: "admin" },
      body: { buyerCompany: "507f1f77bcf86cd799439012", buyer: "507f1f77bcf86cd799439013" },
    } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Select an active approved contact belonging to the buyer company." }));
  });

  it("prevents associates from spoofing ownership", async () => {
    vi.spyOn(AssociateModel, "findById").mockReturnValue(leanResult({
      _id: "507f1f77bcf86cd799439013",
      associateCompany: "507f1f77bcf86cd799439012",
      registrationStatus: "APPROVED",
      isActive: true,
      isDeleted: false,
    }) as any);
    const res = response();
    await productBiddingController.create({
      user: { id: "507f1f77bcf86cd799439013", role: "associate", associateCompany: "507f1f77bcf86cd799439012" },
      body: { buyerCompany: "507f1f77bcf86cd799439014" },
    } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Associates cannot create buying requests for another company or contact." }));
  });
});
