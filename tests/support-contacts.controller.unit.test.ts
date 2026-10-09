import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/database/models/supportContact", () => ({
  SupportContactModel: {
    find: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

import { SupportContactController } from "../src/controllers/supportContactController";
import { SupportContactModel } from "../src/database/models/supportContact";

const buildRes = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("support contacts controller", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only active contacts to associates in display order", async () => {
    const lean = vi.fn().mockResolvedValue([{ label: "General Support", isActive: true }]);
    const sort = vi.fn(() => ({ lean }));
    vi.mocked(SupportContactModel.find).mockReturnValue({ sort } as any);
    const req: any = { user: { role: "Associate" } };
    const res = buildRes();

    await new SupportContactController().list(req, res, vi.fn());

    expect(SupportContactModel.find).toHaveBeenCalledWith({ isDeleted: { $ne: true }, isActive: true });
    expect(sort).toHaveBeenCalledWith({ sortOrder: 1, createdAt: 1 });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("returns active and inactive contacts to admins", async () => {
    const lean = vi.fn().mockResolvedValue([]);
    vi.mocked(SupportContactModel.find).mockReturnValue({ sort: vi.fn(() => ({ lean })) } as any);
    const req: any = { user: { role: "Admin" } };

    await new SupportContactController().list(req, buildRes(), vi.fn());

    expect(SupportContactModel.find).toHaveBeenCalledWith({ isDeleted: { $ne: true } });
  });

  it("returns active contacts to other authenticated dashboard users", async () => {
    const lean = vi.fn().mockResolvedValue([]);
    vi.mocked(SupportContactModel.find).mockReturnValue({ sort: vi.fn(() => ({ lean })) } as any);
    for (const role of ["Operator", "Team"]) {
      const res = buildRes();
      await new SupportContactController().list({ user: { id: "user-1", role } } as any, res, vi.fn());
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    }
    expect(SupportContactModel.find).toHaveBeenCalledWith({ isDeleted: { $ne: true }, isActive: true });
  });

  it("normalizes valid international numbers when an admin creates a contact", async () => {
    vi.mocked(SupportContactModel.create).mockResolvedValue({ _id: "contact-1" } as any);
    const req: any = { user: { role: "Admin" }, body: { label: "Trade Support", phoneNumber: "+91 98765 43210", sortOrder: 2 } };
    const res = buildRes();

    await new SupportContactController().create(req, res, vi.fn());

    expect(SupportContactModel.create).toHaveBeenCalledWith(expect.objectContaining({
      label: "Trade Support",
      phoneNumber: "+919876543210",
      displayPhoneNumber: "+91 9876543210",
      isActive: true,
      sortOrder: 2,
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rejects missing labels, invalid numbers, and associate mutations", async () => {
    const controller = new SupportContactController();
    const missingLabel = buildRes();
    await controller.create({ user: { role: "Admin" }, body: { phoneNumber: "+919876543210" } } as any, missingLabel, vi.fn());
    expect(missingLabel.status).toHaveBeenCalledWith(400);

    const invalidPhone = buildRes();
    await controller.create({ user: { role: "Admin" }, body: { label: "Help", phoneNumber: "12" } } as any, invalidPhone, vi.fn());
    expect(invalidPhone.status).toHaveBeenCalledWith(400);

    const associate = buildRes();
    await controller.update({ user: { role: "Associate" }, params: { id: "contact-1" }, body: { isActive: false } } as any, associate, vi.fn());
    expect(associate.status).toHaveBeenCalledWith(403);
  });

  it("allows admins to deactivate a contact", async () => {
    vi.mocked(SupportContactModel.findOneAndUpdate).mockResolvedValue({ _id: "contact-1", isActive: false } as any);
    const req: any = { user: { role: "Admin" }, params: { id: "contact-1" }, body: { isActive: false } };
    const res = buildRes();

    await new SupportContactController().update(req, res, vi.fn());

    expect(SupportContactModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "contact-1", isDeleted: { $ne: true } },
      { isActive: false },
      { new: true, runValidators: true }
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
