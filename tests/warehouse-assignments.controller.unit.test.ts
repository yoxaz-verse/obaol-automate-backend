import { beforeEach, describe, expect, it, vi } from "vitest";
import { WarehouseController } from "../src/controllers/warehouseController";

vi.mock("../src/core/hooks/operatorScope", () => ({
  getOperatorCompanyScope: vi.fn(),
}));

vi.mock("../src/database/models/warehouse", () => ({
  WarehouseModel: {
    findById: vi.fn(),
  },
}));

vi.mock("../src/database/models/associate", () => ({
  AssociateModel: {
    findById: vi.fn(),
  },
}));

vi.mock("../src/database/models/associateCompany", () => ({
  AssociateCompanyModel: {
    exists: vi.fn(),
  },
}));

vi.mock("../src/database/models/warehouseAssignment", () => ({
  WarehouseAssignmentModel: {
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
  },
}));

import { getOperatorCompanyScope } from "../src/core/hooks/operatorScope";
import { WarehouseModel } from "../src/database/models/warehouse";
import { AssociateModel } from "../src/database/models/associate";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { WarehouseAssignmentModel } from "../src/database/models/warehouseAssignment";

const mockedScope = vi.mocked(getOperatorCompanyScope);
const mockedWarehouseFindById = vi.mocked(WarehouseModel.findById);
const mockedAssociateFindById = vi.mocked(AssociateModel.findById);
const mockedCompanyExists = vi.mocked(AssociateCompanyModel.exists);
const mockedAssignmentUpsert = vi.mocked(WarehouseAssignmentModel.findOneAndUpdate);

const buildRes = () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
};

describe("warehouse assignments controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows operator booking for assigned company", async () => {
    mockedScope.mockResolvedValueOnce({
      operatorIds: ["operator-1"],
      companyIds: [] as any,
      companyIdSet: new Set(["66d5e5f50a7e173e35db96a1"]),
    });
    mockedWarehouseFindById.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "66d5e5f50a7e173e35db9699", isActive: true }),
      }),
    } as any);
    mockedCompanyExists.mockResolvedValueOnce(true as any);
    mockedAssignmentUpsert.mockReturnValueOnce({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: "assignment-1", status: "ACTIVE" }),
    } as any);

    const controller = new WarehouseController();
    const req: any = {
      user: { id: "operator-1", role: "operator" },
      body: {
        warehouseId: "66d5e5f50a7e173e35db9699",
        companyId: "66d5e5f50a7e173e35db96a1",
      },
    };
    const res = buildRes();
    const next = vi.fn();

    await controller.createWarehouseAssignment(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedAssignmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: expect.anything(),
        companyId: expect.anything(),
      }),
      { $set: { status: "ACTIVE" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  it("blocks operator booking for out-of-scope company", async () => {
    mockedScope.mockResolvedValueOnce({
      operatorIds: ["operator-1"],
      companyIds: [] as any,
      companyIdSet: new Set(["66d5e5f50a7e173e35db96a1"]),
    });
    mockedWarehouseFindById.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "66d5e5f50a7e173e35db9699", isActive: true }),
      }),
    } as any);

    const controller = new WarehouseController();
    const req: any = {
      user: { id: "operator-1", role: "team" },
      body: {
        warehouseId: "66d5e5f50a7e173e35db9699",
        companyId: "66d5e5f50a7e173e35db96a9",
      },
    };
    const res = buildRes();
    const next = vi.fn();

    await controller.createWarehouseAssignment(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedAssignmentUpsert).not.toHaveBeenCalled();
  });

  it("forces associate booking onto own company even if spoofed companyId is sent", async () => {
    mockedWarehouseFindById.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "66d5e5f50a7e173e35db9699", isActive: true }),
      }),
    } as any);
    mockedAssociateFindById.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "66d5e5f50a7e173e35db9701",
          associateCompany: "66d5e5f50a7e173e35db96a1",
        }),
      }),
    } as any);
    mockedAssignmentUpsert.mockReturnValueOnce({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: "assignment-2", status: "ACTIVE" }),
    } as any);

    const controller = new WarehouseController();
    const req: any = {
      user: { id: "66d5e5f50a7e173e35db9701", role: "associate" },
      body: {
        warehouseId: "66d5e5f50a7e173e35db9699",
        companyId: "66d5e5f50a7e173e35db96ff",
      },
    };
    const res = buildRes();
    const next = vi.fn();

    await controller.createWarehouseAssignment(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedAssignmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: expect.anything(),
        companyId: expect.anything(),
      }),
      { $set: { status: "ACTIVE" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  it("lists assignments only for scoped operator company", async () => {
    mockedScope.mockResolvedValueOnce({
      operatorIds: ["operator-1"],
      companyIds: [] as any,
      companyIdSet: new Set(["66d5e5f50a7e173e35db96a1"]),
    });
    (WarehouseAssignmentModel.find as any).mockReturnValueOnce({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: "assignment-3" }]),
      }),
    });

    const controller = new WarehouseController();
    const req: any = {
      user: { id: "operator-1", role: "operator" },
      query: { companyId: "66d5e5f50a7e173e35db96a1", status: "ACTIVE" },
    };
    const res = buildRes();
    const next = vi.fn();

    await controller.listWarehouseAssignments(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect((WarehouseAssignmentModel.find as any)).toHaveBeenCalled();
  });
});
