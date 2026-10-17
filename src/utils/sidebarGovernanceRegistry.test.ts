import { describe, expect, it } from "vitest";
import { ASSOCIATE_SIDEBAR_ROUTES, SIDEBAR_ROUTE_PATHS, createBaselineSidebarMappings } from "./sidebarGovernanceRegistry";

describe("sidebar governance registry", () => {
  it("creates a complete unique baseline for every function", () => {
    const mappings = createBaselineSidebarMappings(["buyer", "testing"]);
    expect(mappings).toHaveLength(ASSOCIATE_SIDEBAR_ROUTES.length * 2);
    expect(new Set(mappings.map((row) => `${row.functionSlug}:${row.routePath}`)).size).toBe(mappings.length);
    expect(mappings.every((row) => SIDEBAR_ROUTE_PATHS.has(row.routePath))).toBe(true);
  });

  it("keeps recovery routes live and unknown future work hidden", () => {
    const buyer = createBaselineSidebarMappings(["buyer"]);
    expect(buyer.find((row) => row.routePath === "/dashboard")?.status).toBe("LIVE");
    expect(buyer.find((row) => row.routePath === "/dashboard/settings")?.status).toBe("LIVE");
    expect(buyer.find((row) => row.routePath === "/dashboard/quality-labs")?.status).toBe("HIDDEN");
  });
});
