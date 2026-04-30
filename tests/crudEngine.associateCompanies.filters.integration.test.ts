import mongoose from "mongoose";
import { CrudEngine } from "../src/core/engine/crud.engine";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { VariantRateModel } from "../src/database/models/variantRate";

describe("CrudEngine associate-companies filters", () => {
  const operatorA = new mongoose.Types.ObjectId();
  const operatorB = new mongoose.Types.ObjectId();

  const createCompany = async (overrides: Record<string, any> = {}) => {
    const rand = Math.random().toString(36).slice(2, 8);
    return AssociateCompanyModel.create({
      name: `Company ${rand}`,
      email: `company.${rand}@example.com`,
      phone: "+919900000001",
      phoneSecondary: "+919900000002",
      ...overrides,
    });
  };

  const createRate = async (associateCompany: any, isLive: boolean) => {
    await VariantRateModel.create({
      rate: 100,
      productVariant: new mongoose.Types.ObjectId(),
      associateCompany,
      isLive,
    } as any);
  };

  it("supports all/assigned/unassigned and live/not_live filters", async () => {
    const assignedLive = await createCompany({ assignedOperator: operatorA });
    const assignedNotLive = await createCompany({ assignedOperator: operatorA });
    const unassignedNoRate = await createCompany({});
    const unassignedLive = await createCompany({});

    await createRate(assignedLive._id, true);
    await createRate(assignedNotLive._id, false);
    await createRate(unassignedLive._id, true);

    const engine = new CrudEngine(AssociateCompanyModel as any, "associate-companies");
    const req = { params: { entity: "associate-companies" }, query: {} } as any;

    const all = await engine.findAll(req, { page: 1, limit: 50 }, { page: 1, limit: 50 });
    expect(all.totalCount).toBe(4);

    const assigned = await engine.findAll(req, { page: 1, limit: 50 }, {
      page: 1,
      limit: 50,
      assignmentStatus: "assigned",
    });
    expect(assigned.totalCount).toBe(2);

    const unassigned = await engine.findAll(req, { page: 1, limit: 50 }, {
      page: 1,
      limit: 50,
      assignmentStatus: "unassigned",
    });
    expect(unassigned.totalCount).toBe(2);

    const live = await engine.findAll(req, { page: 1, limit: 50 }, {
      page: 1,
      limit: 50,
      liveProductStatus: "live",
    });
    expect(live.totalCount).toBe(2);

    const notLive = await engine.findAll(req, { page: 1, limit: 50 }, {
      page: 1,
      limit: 50,
      liveProductStatus: "not_live",
    });
    expect(notLive.totalCount).toBe(2);

    const assignedLiveOnly = await engine.findAll(req, { page: 1, limit: 50 }, {
      page: 1,
      limit: 50,
      assignmentStatus: "assigned",
      liveProductStatus: "live",
    });
    expect(assignedLiveOnly.totalCount).toBe(1);
    expect(String(assignedLiveOnly.data[0]?._id)).toBe(String(assignedLive._id));

    const unassignedNoLive = await engine.findAll(req, { page: 1, limit: 50 }, {
      page: 1,
      limit: 50,
      assignmentStatus: "unassigned",
      liveProductStatus: "not_live",
    });
    expect(unassignedNoLive.totalCount).toBe(1);
    expect(String(unassignedNoLive.data[0]?._id)).toBe(String(unassignedNoRate._id));
  });

  it("applies live/not_live on top of pre-scoped company ids", async () => {
    const opA_live = await createCompany({ assignedOperator: operatorA });
    const opA_notLive = await createCompany({ assignedOperator: operatorA });
    const opB_live = await createCompany({ assignedOperator: operatorB });

    await createRate(opA_live._id, true);
    await createRate(opB_live._id, true);
    await createRate(opA_notLive._id, false);

    const engine = new CrudEngine(AssociateCompanyModel as any, "associate-companies");
    const req = { params: { entity: "associate-companies" }, query: {} } as any;
    const scopedIds = [opA_live._id, opA_notLive._id];

    const scopedLive = await engine.findAll(req, { page: 1, limit: 50 }, {
      page: 1,
      limit: 50,
      _id: { $in: scopedIds },
      liveProductStatus: "live",
    });
    expect(scopedLive.totalCount).toBe(1);
    expect(String(scopedLive.data[0]?._id)).toBe(String(opA_live._id));

    const scopedNotLive = await engine.findAll(req, { page: 1, limit: 50 }, {
      page: 1,
      limit: 50,
      _id: { $in: scopedIds },
      liveProductStatus: "not_live",
    });
    expect(scopedNotLive.totalCount).toBe(1);
    expect(String(scopedNotLive.data[0]?._id)).toBe(String(opA_notLive._id));
  });
});

