import { beforeEach, describe, expect, it } from "vitest";
import { sidebarGovernanceController } from "../src/controllers/sidebarGovernanceController";
import { CompanyFunctionModel } from "../src/database/models/companyFunction";
import { SidebarGovernanceModel } from "../src/database/models/sidebarGovernance";
import { ASSOCIATE_SIDEBAR_ROUTES, createBaselineSidebarMappings, createDefaultSidebarSectionOrder } from "../src/utils/sidebarGovernanceRegistry";

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
});
