import { beforeEach, describe, expect, it } from "vitest";
import { sidebarGovernanceController } from "../src/controllers/sidebarGovernanceController";
import { CompanyFunctionModel } from "../src/database/models/companyFunction";
import { SidebarGovernanceModel } from "../src/database/models/sidebarGovernance";
import { ASSOCIATE_SIDEBAR_ROUTES, createBaselineSidebarMappings, createDefaultSidebarSectionOrder, migrateBiddingSplit, migrateUnassignedFallbacks } from "../src/utils/sidebarGovernanceRegistry";

const response = () => {
  const state: { status: number; body?: any } = { status: 200 };
  const res: any = {
    status(code: number) { state.status = code; return res; },
    json(body: any) { state.body = body; return res; },
  };
  return { res, state };
};

const validDraft = (mappings = createBaselineSidebarMappings(["buyer", "seller"])) => ({
  resolutionVersion: 2,
  sectionOrder: createDefaultSidebarSectionOrder(),
  fallbackStatusByRoute: Object.fromEntries(ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => [path, "HIDDEN"])),
  mappings,
});

describe("sidebar governance canonical functions", () => {
  beforeEach(async () => {
    await Promise.all([CompanyFunctionModel.deleteMany({}), SidebarGovernanceModel.deleteMany({})]);
    await CompanyFunctionModel.create([
      { name: "Buyer", slug: "buyer", isActive: true, orderIndex: 1 },
      { name: "Buying", slug: "buying", isActive: true, orderIndex: 2 },
      { name: "Seller", slug: "seller", isActive: true, orderIndex: 3 },
      { name: "Selling", slug: "selling", isActive: true, orderIndex: 4 },
    ]);
  });

  it("returns Buyer and Seller exactly once when legacy rows coexist", async () => {
    const { res, state } = response();
    await sidebarGovernanceController.getAdmin({} as any, res);
    expect(state.status).toBe(200);
    expect(state.body.data.functions.map((row: any) => [row.name, row.slug])).toEqual([
      ["Buyer", "buyer"],
      ["Seller", "seller"],
    ]);
    expect(state.body.data.commonRoutes.map((row: any) => row.path)).toEqual(["/dashboard", "/dashboard/guidance", "/dashboard/settings", "/dashboard/customer-support"]);
    expect(state.body.data.commonRoutes.map((row: any) => row.position)).toEqual(["TOP", "BOTTOM", "BOTTOM", "BOTTOM"]);
    expect(state.body.data.routes.some((row: any) => row.path === "/dashboard")).toBe(false);
    expect(state.body.data.pageRules).toBeUndefined();
    expect(state.body.data.config.published.mappings).toBeUndefined();
  });

  it("rejects attempts to save code-controlled common routes", async () => {
    const { res, state } = response();
    await sidebarGovernanceController.saveDraft({ body: { expectedDraftRevision: 1, mappings: [{ functionSlug: "buyer", routePath: "/dashboard", placement: "SEEKING", status: "LIVE", order: 0 }] }, user: { id: "000000000000000000000001" } } as any, res);
    expect(state.status).toBe(400);
    expect(state.body.message).toMatch(/unknown dashboard route/i);
  });

  it("rejects legacy governance mappings", async () => {
    const { res, state } = response();
    await sidebarGovernanceController.saveDraft({ body: { expectedDraftRevision: 1, mappings: [{ functionSlug: "buying", routePath: "/dashboard", placement: "BOTH", status: "LIVE", order: 0 }] }, user: { id: "000000000000000000000001" } } as any, res);
    expect(state.status).toBe(400);
    expect(state.body.message).toMatch(/legacy company function/i);
  });

  it("rejects a stale draft write without replacing the newer draft", async () => {
    const mapping = { functionSlug: "buyer", routePath: "/dashboard/marketplace", placement: "SEEKING", status: "LIVE", order: 0 };
    const mappings = createBaselineSidebarMappings(["buyer", "seller"]).map((row) => row.functionSlug === mapping.functionSlug && row.routePath === mapping.routePath ? mapping : row);
    const first = response();
    await sidebarGovernanceController.saveDraft({ body: { expectedDraftRevision: 1, ...validDraft(mappings) }, user: { id: "000000000000000000000001" } } as any, first.res);
    expect(first.state.status).toBe(200);
    expect(first.state.body.data.draft.revision).toBe(2);

    const stale = response();
    await sidebarGovernanceController.saveDraft({ body: { expectedDraftRevision: 1, ...validDraft(mappings.map((row) => row.functionSlug === mapping.functionSlug && row.routePath === mapping.routePath ? { ...row, status: "HIDDEN" } : row)) }, user: { id: "000000000000000000000002" } } as any, stale.res);
    expect(stale.state.status).toBe(409);
    expect(stale.state.body.error).toMatchObject({ code: "SIDEBAR_GOVERNANCE_REVISION_CONFLICT", snapshot: "draft", expectedRevision: 1, currentRevision: 2 });
    const stored: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
    expect(stored.draft.mappings.find((row: any) => row.functionSlug === "buyer" && row.routePath === "/dashboard/marketplace").status).toBe("LIVE");
  });

  it("publishes only when both expected revisions still match", async () => {
    const mapping = { functionSlug: "seller", routePath: "/dashboard/product", placement: "PROVIDING", status: "LIVE", order: 0 };
    const mappings = createBaselineSidebarMappings(["buyer", "seller"]).map((row) => row.functionSlug === mapping.functionSlug && row.routePath === mapping.routePath ? mapping : row);
    const saved = response();
    await sidebarGovernanceController.saveDraft({ body: { expectedDraftRevision: 1, ...validDraft(mappings) }, user: { id: "000000000000000000000001" } } as any, saved.res);
    const published = response();
    await sidebarGovernanceController.publish({ body: { expectedDraftRevision: 2, expectedPublishedRevision: 1 }, user: { id: "000000000000000000000001" } } as any, published.res);
    expect(published.state.status).toBe(200);
    expect(published.state.body.data.published.revision).toBe(2);

    const stale = response();
    await sidebarGovernanceController.publish({ body: { expectedDraftRevision: 2, expectedPublishedRevision: 1 }, user: { id: "000000000000000000000001" } } as any, stale.res);
    expect(stale.state.status).toBe(409);
    expect(stale.state.body.error).toMatchObject({ code: "SIDEBAR_GOVERNANCE_REVISION_CONFLICT", snapshot: "published", currentRevision: 2 });
  });

  it("saves and publishes complete drafts containing Unassigned mappings", async () => {
    const mappings = createBaselineSidebarMappings(["buyer", "seller"]).map((row) => row.functionSlug === "buyer" && row.routePath === "/dashboard/marketplace"
      ? { ...row, placement: "UNASSIGNED" as const, status: "HIDDEN" as const }
      : row);
    const saved = response();
    await sidebarGovernanceController.saveDraft({ body: { expectedDraftRevision: 1, ...validDraft(mappings) }, user: { id: "000000000000000000000001", role: "admin" } } as any, saved.res);
    expect(saved.state.status).toBe(200);

    const published = response();
    await sidebarGovernanceController.publish({ body: { expectedDraftRevision: 2, expectedPublishedRevision: 1 }, user: { id: "000000000000000000000001", role: "admin" } } as any, published.res);
    expect(published.state.status).toBe(200);

    const read = response();
    await sidebarGovernanceController.getPublished({ user: { role: "admin" } } as any, read.res);
    expect(read.state.status).toBe(200);
    expect(read.state.body.data.mappings.some((row: any) => row.placement === "UNASSIGNED")).toBe(false);
    expect(read.state.body.data.mappings.some((row: any) => row.status === "HIDDEN")).toBe(false);
  });

  it("keeps published reads free of draft migrations and writes", async () => {
    const mappings = createBaselineSidebarMappings(["buyer", "seller"]);
    const sectionOrder = createDefaultSidebarSectionOrder();
    const fallbackStatusByRoute = Object.fromEntries(ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => [path, "HIDDEN"]));
    await SidebarGovernanceModel.create({ key: "associate-sidebar", matrixMigrationVersion: 2, draft: { revision: 4, resolutionVersion: 1, sectionOrder, fallbackStatusByRoute, mappings }, published: { revision: 3, resolutionVersion: 2, sectionOrder, fallbackStatusByRoute, mappings } });
    const before: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
    const result = response();
    await sidebarGovernanceController.getPublished({ user: { role: "admin" } } as any, result.res);
    const after: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
    expect(result.state.status).toBe(200);
    expect(after.matrixMigrationVersion).toBe(before.matrixMigrationVersion);
    expect(after.draft.revision).toBe(before.draft.revision);
    expect(after.draft.resolutionVersion).toBe(before.draft.resolutionVersion);
  });

  it("returns a transient baseline without writing when published governance is absent", async () => {
    await SidebarGovernanceModel.deleteMany({});
    const result = response();
    await sidebarGovernanceController.getPublished({ user: { role: "admin" } } as any, result.res);
    expect(result.state.status).toBe(200);
    expect(result.state.body.data.revision).toBe(0);
    expect(result.state.body.data.resolutionVersion).toBe(2);
    expect(await SidebarGovernanceModel.countDocuments()).toBe(0);
  });

  it("rejects visible statuses for Unassigned mappings", async () => {
    const mappings = createBaselineSidebarMappings(["buyer", "seller"]).map((row) => row.functionSlug === "buyer" && row.routePath === "/dashboard/marketplace"
      ? { ...row, placement: "UNASSIGNED" as const, status: "LIVE" as const }
      : row);
    const result = response();
    await sidebarGovernanceController.saveDraft({ body: { expectedDraftRevision: 1, ...validDraft(mappings) }, user: { id: "000000000000000000000001" } } as any, result.res);
    expect(result.state.status).toBe(400);
    expect(result.state.body.message).toMatch(/unassigned mapping must be hidden/i);
  });

  it("allows mixed Other Services statuses for the same page", async () => {
    const mappings = createBaselineSidebarMappings(["buyer", "seller"]).map((row) => row.routePath === "/dashboard/marketplace"
      ? { ...row, placement: "OTHER_SERVICES" as const, status: row.functionSlug === "buyer" ? "HIDDEN" as const : "LIVE" as const }
      : row);
    const result = response();
    await sidebarGovernanceController.saveDraft({ body: { expectedDraftRevision: 1, ...validDraft(mappings) }, user: { id: "000000000000000000000001" } } as any, result.res);
    expect(result.state.status).toBe(200);
  });

  it("normalizes legacy hidden fallbacks when restoring the published snapshot", async () => {
    const sectionOrder = createDefaultSidebarSectionOrder();
    const fallbackStatusByRoute = Object.fromEntries(ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => [path, "HIDDEN"]));
    const publishedMappings = createBaselineSidebarMappings(["buyer", "seller"]).map((row) => row.functionSlug === "buyer" && row.routePath === "/dashboard/marketplace"
      ? { ...row, placement: "OTHER_SERVICES" as const, status: "HIDDEN" as const }
      : row);
    await SidebarGovernanceModel.create({
      key: "associate-sidebar",
      matrixMigrationVersion: 4,
      draft: { revision: 4, resolutionVersion: 2, sectionOrder, fallbackStatusByRoute, mappings: createBaselineSidebarMappings(["buyer", "seller"]) },
      published: { revision: 3, resolutionVersion: 2, sectionOrder, fallbackStatusByRoute, mappings: publishedMappings },
    });
    const result = response();
    await sidebarGovernanceController.resetDraft({ body: { expectedDraftRevision: 4 }, user: { id: "000000000000000000000001" } } as any, result.res);
    expect(result.state.status).toBe(200);
    expect(result.state.body.data.draft.mappings).toContainEqual(expect.objectContaining({ functionSlug: "buyer", routePath: "/dashboard/marketplace", placement: "UNASSIGNED", status: "HIDDEN" }));
  });

  it("normalizes Bidding in the draft once without changing the published snapshot", async () => {
    const legacyMappings = createBaselineSidebarMappings(["buyer", "seller"]).map((row) => row.routePath === "/dashboard/bidding" ? { ...row, placement: "BOTH" as const, status: "LIVE" as const } : row);
    const sectionOrder = createDefaultSidebarSectionOrder();
    const fallbackStatusByRoute = Object.fromEntries(ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => [path, "HIDDEN"]));
    await SidebarGovernanceModel.create({ key: "associate-sidebar", matrixMigrationVersion: 2, draft: { revision: 4, resolutionVersion: 2, sectionOrder, fallbackStatusByRoute, mappings: legacyMappings }, published: { revision: 3, resolutionVersion: 2, sectionOrder, fallbackStatusByRoute, mappings: legacyMappings } });

    const first = response();
    await sidebarGovernanceController.getAdmin({} as any, first.res);
    const stored: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
    expect(stored.matrixMigrationVersion).toBe(4);
    expect(stored.draft.revision).toBe(5);
    expect(stored.draft.mappings).toContainEqual(expect.objectContaining({ functionSlug: "seller", routePath: "/dashboard/bidding", placement: "PROVIDING", status: "LIVE" }));
    expect(stored.draft.mappings).toContainEqual(expect.objectContaining({ functionSlug: "buyer", routePath: "/dashboard/bidding", placement: "UNASSIGNED", status: "HIDDEN" }));
    expect(stored.published.revision).toBe(3);
    expect(stored.published.mappings).toContainEqual(expect.objectContaining({ functionSlug: "buyer", routePath: "/dashboard/bidding", placement: "BOTH", status: "LIVE" }));

    const second = response();
    await sidebarGovernanceController.getAdmin({} as any, second.res);
    const afterSecondLoad: any = await SidebarGovernanceModel.findOne({ key: "associate-sidebar" }).lean();
    expect(afterSecondLoad.draft.revision).toBe(5);
  });
});

describe("bidding governance migration", () => {
  it("places buyer and seller bidding routes in separate perspectives", () => {
    const mappings = createBaselineSidebarMappings(["buyer", "seller"]);
    expect(mappings).toContainEqual(expect.objectContaining({ functionSlug: "buyer", routePath: "/dashboard/bidding/my", placement: "SEEKING", status: "LIVE" }));
    expect(mappings).toContainEqual(expect.objectContaining({ functionSlug: "seller", routePath: "/dashboard/bidding", placement: "PROVIDING", status: "LIVE" }));
    expect(mappings).toContainEqual(expect.objectContaining({ functionSlug: "buyer", routePath: "/dashboard/bidding", status: "HIDDEN" }));
    expect(mappings).toContainEqual(expect.objectContaining({ functionSlug: "seller", routePath: "/dashboard/bidding/my", status: "HIDDEN" }));
  });

  it("moves the buyer setting to My Buying Requests and preserves the seller setting", () => {
    const migrated = migrateBiddingSplit([
      { functionSlug: "buyer", routePath: "/dashboard/bidding", placement: "BOTH", status: "COMING_SOON", order: 7 },
      { functionSlug: "seller", routePath: "/dashboard/bidding", placement: "BOTH", status: "LIVE", order: 4 },
    ]);
    expect(migrated).toContainEqual({ functionSlug: "buyer", routePath: "/dashboard/bidding/my", placement: "SEEKING", status: "COMING_SOON", order: 7 });
    expect(migrated).toContainEqual({ functionSlug: "buyer", routePath: "/dashboard/bidding", placement: "PROVIDING", status: "HIDDEN", order: 7 });
    expect(migrated).toContainEqual({ functionSlug: "seller", routePath: "/dashboard/bidding", placement: "PROVIDING", status: "LIVE", order: 4 });
  });
});

describe("unassigned fallback migration", () => {
  it("converts only hidden Other Services fallbacks and is idempotent", () => {
    const input = [
      { functionSlug: "buyer", routePath: "/dashboard/bidding", placement: "OTHER_SERVICES", status: "HIDDEN", order: 0 },
      { functionSlug: "seller", routePath: "/dashboard/bidding", placement: "OTHER_SERVICES", status: "LIVE", order: 0 },
      { functionSlug: "buyer", routePath: "/dashboard/product", placement: "PROVIDING", status: "HIDDEN", order: 1 },
    ];
    const migrated = migrateUnassignedFallbacks(input);
    expect(migrated).toEqual([
      { ...input[0], placement: "UNASSIGNED" },
      input[1],
      input[2],
    ]);
    expect(migrateUnassignedFallbacks(migrated)).toEqual(migrated);
  });
});
