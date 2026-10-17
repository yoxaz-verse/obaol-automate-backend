import { describe, expect, it } from "vitest";
import { migrateCommonRoutesFromSnapshot } from "./sidebarCommonMigration";

describe("sidebar common-route migration", () => {
  it("removes common mappings, preserves business mappings, and increments once", () => {
    const now = new Date("2026-10-18T00:00:00.000Z");
    const original = { revision: 4, updatedBy: "actor", mappings: [
      { functionSlug: "buyer", routePath: "/dashboard", placement: "BOTH", status: "LIVE", order: 0 },
      { functionSlug: "buyer", routePath: "/dashboard/marketplace", placement: "SEEKING", status: "LIVE", order: 1 },
    ] };
    const first: any = migrateCommonRoutesFromSnapshot(original, now);
    expect(first.changed).toBe(true);
    expect(first.snapshot.revision).toBe(5);
    expect(first.snapshot.updatedAt).toEqual(now);
    expect(first.snapshot.mappings).toEqual([{ functionSlug: "buyer", routePath: "/dashboard/marketplace", placement: "SEEKING", status: "LIVE", order: 1 }]);
    const second = migrateCommonRoutesFromSnapshot(first.snapshot, now);
    expect(second.changed).toBe(false);
    expect(second.snapshot.revision).toBe(5);
  });
});
