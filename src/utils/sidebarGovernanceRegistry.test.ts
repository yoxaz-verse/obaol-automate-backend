import { describe, expect, it } from "vitest";
import { ASSOCIATE_SIDEBAR_ROUTES, COMMON_ASSOCIATE_SIDEBAR_ROUTES, SIDEBAR_ROUTE_PATHS, canonicalizeGovernanceMappings, createBaselineSidebarMappings, deriveSidebarSectionOrder } from "./sidebarGovernanceRegistry";

describe("sidebar governance registry", () => {
  it("creates a complete unique baseline for every function", () => {
    const mappings = createBaselineSidebarMappings(["buyer", "testing"]);
    expect(mappings).toHaveLength(ASSOCIATE_SIDEBAR_ROUTES.length * 2);
    expect(new Set(mappings.map((row) => `${row.functionSlug}:${row.routePath}`)).size).toBe(mappings.length);
    expect(mappings.every((row) => SIDEBAR_ROUTE_PATHS.has(row.routePath))).toBe(true);
  });

  it("keeps common routes outside function baselines and unknown future work hidden", () => {
    const buyer = createBaselineSidebarMappings(["buyer"]);
    const buyerPaths = new Set<string>(buyer.map((row) => row.routePath));
    expect(COMMON_ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path)).toEqual(["/dashboard", "/dashboard/guidance", "/dashboard/settings", "/dashboard/customer-support"]);
    expect(COMMON_ASSOCIATE_SIDEBAR_ROUTES.map(([, , , position]) => position)).toEqual(["TOP", "BOTTOM", "BOTTOM", "BOTTOM"]);
    expect(buyerPaths.has("/dashboard")).toBe(false);
    expect(buyerPaths.has("/dashboard/settings")).toBe(false);
    expect(buyer.find((row) => row.routePath === "/dashboard/quality-labs")?.status).toBe("HIDDEN");
  });

  it("removes common mappings and prefers work placement over other services", () => {
    const mappings = canonicalizeGovernanceMappings([
      { functionSlug: "buyer", routePath: "/dashboard", placement: "BOTH", status: "LIVE", order: 0 },
      { functionSlug: "buyer", routePath: "/dashboard/catalog", placement: "OTHER_SERVICES", status: "LIVE", order: 8 },
      { functionSlug: "buying", routePath: "/dashboard/catalog", placement: "SEEKING", status: "COMING_SOON", order: 2 },
    ]);
    expect(mappings).toEqual([{ functionSlug: "buyer", routePath: "/dashboard/catalog", placement: "SEEKING", status: "LIVE", order: 2 }]);
  });

  it("separates participant discovery from owned and operational workspaces", () => {
    const mappings = createBaselineSidebarMappings(["testing", "importing-to-india", "warehouse-storage"]);
    const find = (slug: string, routePath: string) => mappings.find((row) => row.functionSlug === slug && row.routePath === routePath);
    expect(find("testing", "/dashboard/quality-labs")?.placement).toBe("SEEKING");
    expect(find("testing", "/dashboard/quality-labs/my")?.placement).toBe("PROVIDING");
    expect(find("testing", "/dashboard/quality-labs/execution")?.status).toBe("LIVE");
    expect(find("importing-to-india", "/dashboard/imports/reservations")?.placement).toBe("SEEKING");
    expect(find("importing-to-india", "/dashboard/imports/my-listings")?.placement).toBe("PROVIDING");
    expect(find("warehouse-storage", "/dashboard/warehouse-rent")?.placement).toBe("SEEKING");
    expect(find("warehouse-storage", "/dashboard/warehouses/operations")?.placement).toBe("PROVIDING");
  });

  it("merges legacy buyer and seller mappings with the most available policy", () => {
    const mappings = canonicalizeGovernanceMappings([
      { functionSlug: "buyer", routePath: "/dashboard/marketplace", placement: "SEEKING", status: "COMING_SOON", order: 8 },
      { functionSlug: "buying", routePath: "/dashboard/marketplace", placement: "PROVIDING", status: "LIVE", order: 3 },
      { functionSlug: "selling", routePath: "/dashboard/product", placement: "PROVIDING", status: "HIDDEN", order: 4 },
    ]);
    expect(mappings).toEqual([
      { functionSlug: "buyer", routePath: "/dashboard/marketplace", placement: "BOTH", status: "LIVE", order: 3 },
      { functionSlug: "seller", routePath: "/dashboard/product", placement: "PROVIDING", status: "HIDDEN", order: 4 },
    ]);
  });

  it("derives an Important order for routes assigned to both work perspectives", () => {
    const order = deriveSidebarSectionOrder([
      { routePath: "/dashboard/orders", placement: "SEEKING", order: 8 },
      { routePath: "/dashboard/orders", placement: "PROVIDING", order: 3 },
      { routePath: "/dashboard/sample-requests", placement: "BOTH", order: 1 },
    ]);
    expect(order.IMPORTANT.slice(0, 2)).toEqual(["/dashboard/sample-requests", "/dashboard/orders"]);
  });
});
