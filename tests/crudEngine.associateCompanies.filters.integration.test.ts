import mongoose from "mongoose";
import { CrudEngine } from "../src/core/engine/crud.engine";
import { registerAllHooks } from "../src/core/hooks";
import { getEntityConfig } from "../src/core/registry/entities";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { VariantRateModel } from "../src/database/models/variantRate";

describe("CrudEngine associate-companies filters", () => {
  const operatorA = new mongoose.Types.ObjectId();
  const operatorB = new mongoose.Types.ObjectId();
  let originalAssociateCompanyRelations: Record<string, string> | null = null;

  beforeAll(() => {
    registerAllHooks();
    const cfg = getEntityConfig("associate-companies");
    originalAssociateCompanyRelations = { ...(cfg.relations || {}) };
    const nextRelations = { ...(cfg.relations || {}) };
    delete (nextRelations as any).assignedOperator;
    cfg.relations = nextRelations;
  });

  afterAll(() => {
    if (!originalAssociateCompanyRelations) return;
    const cfg = getEntityConfig("associate-companies");
    cfg.relations = originalAssociateCompanyRelations;
  });

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

  const createLegacyCompanyWithEmptyAssignedOperator = async () => {
    const rand = Math.random().toString(36).slice(2, 8);
    const payload = {
      name: `Legacy Company ${rand}`,
      email: `legacy.company.${rand}@example.com`,
      phone: "+919900000003",
      phoneSecondary: "+919900000004",
      assignedOperator: "",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const inserted = await AssociateCompanyModel.collection.insertOne(payload as any);
    return inserted.insertedId;
  };


  const createLegacyCompanyWithInvalidAssignedOperator = async () => {
    const rand = Math.random().toString(36).slice(2, 8);
    const payload = {
      name: `Legacy Invalid Company ${rand}`,
      email: `legacy.invalid.company.${rand}@example.com`,
      phone: "+919900000005",
      phoneSecondary: "+919900000006",
      assignedOperator: "legacy-invalid-operator",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const inserted = await AssociateCompanyModel.collection.insertOne(payload as any);
    return inserted.insertedId;
  };

  const createLegacyCompanyWithValidAssignedOperatorString = async () => {
    const rand = Math.random().toString(36).slice(2, 8);
    const payload = {
      name: `Legacy Valid Company ${rand}`,
      email: `legacy.valid.company.${rand}@example.com`,
      phone: "+919900000007",
      phoneSecondary: "+919900000008",
      assignedOperator: new mongoose.Types.ObjectId().toHexString(),
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const inserted = await AssociateCompanyModel.collection.insertOne(payload as any);
    return inserted.insertedId;
  };

  it("supports all/assigned/unassigned and live/not_live filters", async () => {
    const assignedLive = await createCompany({ assignedOperator: operatorA });
    const assignedNotLive = await createCompany({ assignedOperator: operatorA });
    const unassignedNoRate = await createCompany({});
    const unassignedLive = await createCompany({});
    const unassignedEmptyStringId = await createLegacyCompanyWithEmptyAssignedOperator();
    const unassignedInvalidStringId = await createLegacyCompanyWithInvalidAssignedOperator();
    const assignedLegacyStringId = await createLegacyCompanyWithValidAssignedOperatorString();

    await createRate(assignedLive._id, true);
    await createRate(assignedNotLive._id, false);
    await createRate(unassignedLive._id, true);

    const engine = new CrudEngine(AssociateCompanyModel as any, "associate-companies");
    const req = { params: { entity: "associate-companies" }, query: {} } as any;

    const all = await engine.findAll(req, { page: 1, limit: 50 }, {});
    expect(all.totalCount).toBe(7);

    const assigned = await engine.findAll(req, { page: 1, limit: 50 }, {
      assignmentStatus: "assigned",
    });
    expect(assigned.totalCount).toBe(3);
    const assignedIds = assigned.data.map((row: any) => String(row?._id));
    expect(assignedIds).toContain(String(assignedLegacyStringId));

    const unassigned = await engine.findAll(req, { page: 1, limit: 50 }, {
      assignmentStatus: "unassigned",
    });
    expect(unassigned.totalCount).toBe(4);
    const unassignedIds = unassigned.data.map((row: any) => String(row?._id));
    expect(unassignedIds).toContain(String(unassignedEmptyStringId));
    expect(unassignedIds).toContain(String(unassignedInvalidStringId));

    const live = await engine.findAll(req, { page: 1, limit: 50 }, {
      liveProductStatus: "live",
    });
    expect(live.totalCount).toBe(2);

    const notLive = await engine.findAll(req, { page: 1, limit: 50 }, {
      liveProductStatus: "not_live",
    });
    expect(notLive.totalCount).toBe(5);

    const assignedLiveOnly = await engine.findAll(req, { page: 1, limit: 50 }, {
      assignmentStatus: "assigned",
      liveProductStatus: "live",
    });
    expect(assignedLiveOnly.totalCount).toBe(1);
    expect(String(assignedLiveOnly.data[0]?._id)).toBe(String(assignedLive._id));

    const assignedNotLiveOnly = await engine.findAll(req, { page: 1, limit: 50 }, {
      assignmentStatus: "assigned",
      liveProductStatus: "not_live",
    });
    expect(assignedNotLiveOnly.totalCount).toBe(2);
    const assignedNotLiveIds = assignedNotLiveOnly.data.map((row: any) => String(row?._id));
    expect(assignedNotLiveIds).toContain(String(assignedNotLive._id));
    expect(assignedNotLiveIds).toContain(String(assignedLegacyStringId));

    const unassignedNoLive = await engine.findAll(req, { page: 1, limit: 50 }, {
      assignmentStatus: "unassigned",
      liveProductStatus: "not_live",
    });
    expect(unassignedNoLive.totalCount).toBe(3);
    const unassignedNoLiveIds = unassignedNoLive.data.map((row: any) => String(row?._id));
    expect(unassignedNoLiveIds).toContain(String(unassignedNoRate._id));
    expect(unassignedNoLiveIds).toContain(String(unassignedEmptyStringId));
    expect(unassignedNoLiveIds).toContain(String(unassignedInvalidStringId));
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
      _id: { $in: scopedIds },
      liveProductStatus: "live",
    });
    expect(scopedLive.totalCount).toBe(1);
    expect(String(scopedLive.data[0]?._id)).toBe(String(opA_live._id));

    const scopedNotLive = await engine.findAll(req, { page: 1, limit: 50 }, {
      _id: { $in: scopedIds },
      liveProductStatus: "not_live",
    });
    expect(scopedNotLive.totalCount).toBe(1);
    expect(String(scopedNotLive.data[0]?._id)).toBe(String(opA_notLive._id));
  });

  it("returns non-zero for assigned + not_live when matching records exist", async () => {
    const assignedLive = await createCompany({ assignedOperator: operatorA });
    const assignedNotLiveA = await createCompany({ assignedOperator: operatorA });
    const assignedNotLiveB = await createCompany({ assignedOperator: operatorB });

    await createRate(assignedLive._id, true);
    await createRate(assignedNotLiveA._id, false);
    await createRate(assignedNotLiveB._id, false);

    const engine = new CrudEngine(AssociateCompanyModel as any, "associate-companies");
    const req = { params: { entity: "associate-companies" }, query: {} } as any;

    const assignedNotLive = await engine.findAll(req, { page: 1, limit: 50 }, {
      assignmentStatus: "assigned",
      liveProductStatus: "not_live",
    });

    expect(assignedNotLive.totalCount).toBeGreaterThan(0);
    expect(assignedNotLive.totalCount).toBe(2);
  });

  it("supports pagination and search with combined assignment + live filters", async () => {
    const assignedLiveAlpha = await createCompany({
      name: "Alpha Filter Target",
      assignedOperator: operatorA,
    });
    const assignedLiveAlpine = await createCompany({
      name: "Alpine Filter Target",
      assignedOperator: operatorA,
    });
    const assignedLiveBeta = await createCompany({
      name: "Beta Filter Target",
      assignedOperator: operatorA,
    });
    const assignedNotLiveAlpha = await createCompany({
      name: "Alpha Not Live Target",
      assignedOperator: operatorA,
    });
    const unassignedLiveAlpha = await createCompany({
      name: "Alpha Unassigned Live Target",
    });

    await createRate(assignedLiveAlpha._id, true);
    await createRate(assignedLiveAlpine._id, true);
    await createRate(assignedLiveBeta._id, true);
    await createRate(unassignedLiveAlpha._id, true);
    await createRate(assignedNotLiveAlpha._id, false);

    const engine = new CrudEngine(AssociateCompanyModel as any, "associate-companies");
    const req = { params: { entity: "associate-companies" }, query: {} } as any;

    const pageOne = await engine.findAll(
      req,
      { page: 1, limit: 1 },
      {
        search: "Alpha",
        assignmentStatus: "assigned",
        liveProductStatus: "live",
        sort: "name:asc",
      }
    );

    expect(pageOne.totalCount).toBe(1);
    expect(pageOne.currentPage).toBe(1);
    expect(pageOne.totalPages).toBe(1);
    expect(pageOne.data).toHaveLength(1);
    expect(String(pageOne.data[0]?.name || "")).toContain("Alpha");
    expect(String(pageOne.data[0]?._id)).toBe(String(assignedLiveAlpha._id));

    const pageTwo = await engine.findAll(
      req,
      { page: 2, limit: 1 },
      {
        search: "Alpha",
        assignmentStatus: "assigned",
        liveProductStatus: "live",
        sort: "name:asc",
      }
    );

    expect(pageTwo.totalCount).toBe(1);
    expect(pageTwo.currentPage).toBe(2);
    expect(pageTwo.totalPages).toBe(1);
    expect(pageTwo.data).toHaveLength(0);
  });

  it("applies live/not_live filters correctly for operator-scoped company directory reads", async () => {
    const operatorUserId = new mongoose.Types.ObjectId();

    const scopedLive = await createCompany({
      name: "Scoped Live Company",
      assignedOperator: operatorUserId,
    });
    const scopedNotLive = await createCompany({
      name: "Scoped Not Live Company",
      assignedOperator: operatorUserId,
    });
    const outsideLive = await createCompany({
      name: "Outside Live Company",
      assignedOperator: operatorB,
    });

    await createRate(scopedLive._id, true);
    await createRate(scopedNotLive._id, false);
    await createRate(outsideLive._id, true);

    const engine = new CrudEngine(AssociateCompanyModel as any, "associate-companies");
    const reqBase = {
      params: { entity: "associate-companies" },
      user: { id: String(operatorUserId), role: "operator" },
      query: {},
    } as any;

    const operatorLive = await engine.findAll(
      { ...reqBase, query: { liveProductStatus: "live" } },
      { page: 1, limit: 50 },
      { liveProductStatus: "live" }
    );
    expect(operatorLive.totalCount).toBe(1);
    expect(String(operatorLive.data[0]?._id)).toBe(String(scopedLive._id));

    const operatorNotLive = await engine.findAll(
      { ...reqBase, query: { liveProductStatus: "not_live" } },
      { page: 1, limit: 50 },
      { liveProductStatus: "not_live" }
    );
    expect(operatorNotLive.totalCount).toBe(1);
    expect(String(operatorNotLive.data[0]?._id)).toBe(String(scopedNotLive._id));
  });

  it("supports operator-scoped search + live filter + pagination", async () => {
    const operatorUserId = new mongoose.Types.ObjectId();

    const scopedAlphaLive = await createCompany({
      name: "Alpha Scoped Live",
      assignedOperator: operatorUserId,
    });
    await createCompany({
      name: "Alpha Scoped Not Live",
      assignedOperator: operatorUserId,
    });
    await createCompany({
      name: "Alpha Outside Live",
      assignedOperator: operatorB,
    });

    await createRate(scopedAlphaLive._id, true);

    const engine = new CrudEngine(AssociateCompanyModel as any, "associate-companies");
    const reqBase = {
      params: { entity: "associate-companies" },
      user: { id: String(operatorUserId), role: "team" },
      query: {},
    } as any;

    const pageOne = await engine.findAll(
      { ...reqBase, query: { search: "Alpha", liveProductStatus: "live", sort: "name:asc", page: "1", limit: "1" } },
      { page: 1, limit: 1 },
      { search: "Alpha", liveProductStatus: "live", sort: "name:asc" }
    );
    expect(pageOne.totalCount).toBe(1);
    expect(pageOne.currentPage).toBe(1);
    expect(pageOne.totalPages).toBe(1);
    expect(pageOne.data).toHaveLength(1);
    expect(String(pageOne.data[0]?._id)).toBe(String(scopedAlphaLive._id));

    const pageTwo = await engine.findAll(
      { ...reqBase, query: { search: "Alpha", liveProductStatus: "live", sort: "name:asc", page: "2", limit: "1" } },
      { page: 2, limit: 1 },
      { search: "Alpha", liveProductStatus: "live", sort: "name:asc" }
    );
    expect(pageTwo.totalCount).toBe(1);
    expect(pageTwo.currentPage).toBe(2);
    expect(pageTwo.totalPages).toBe(1);
    expect(pageTwo.data).toHaveLength(0);
  });
});
