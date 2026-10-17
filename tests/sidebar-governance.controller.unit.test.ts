import { beforeEach, describe, expect, it } from "vitest";
import { sidebarGovernanceController } from "../src/controllers/sidebarGovernanceController";
import { CompanyFunctionModel } from "../src/database/models/companyFunction";
import { SidebarGovernanceModel } from "../src/database/models/sidebarGovernance";

const response = () => {
  const state: { status: number; body?: any } = { status: 200 };
  const res: any = {
    status(code: number) { state.status = code; return res; },
    json(body: any) { state.body = body; return res; },
  };
  return { res, state };
};

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
    expect(state.body.data.routes.some((row: any) => row.path === "/dashboard")).toBe(false);
  });

  it("rejects attempts to save code-controlled common routes", async () => {
    const { res, state } = response();
    await sidebarGovernanceController.saveDraft({ body: { mappings: [{ functionSlug: "buyer", routePath: "/dashboard", placement: "SEEKING", status: "LIVE", order: 0 }] }, user: { id: "000000000000000000000001" } } as any, res);
    expect(state.status).toBe(400);
    expect(state.body.message).toMatch(/unknown dashboard route/i);
  });

  it("rejects legacy governance mappings", async () => {
    const { res, state } = response();
    await sidebarGovernanceController.saveDraft({ body: { mappings: [{ functionSlug: "buying", routePath: "/dashboard", placement: "BOTH", status: "LIVE", order: 0 }] }, user: { id: "000000000000000000000001" } } as any, res);
    expect(state.status).toBe(400);
    expect(state.body.message).toMatch(/legacy company function/i);
  });
});
