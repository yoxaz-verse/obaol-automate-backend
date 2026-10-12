import { describe, expect, it } from "vitest";
import { resolveAssociateDashboardRoles } from "./dashboardPerspective";

describe("associate dashboard perspective", () => {
  it("maps provided trade capabilities to the associate's direct role", () => {
    expect(resolveAssociateDashboardRoles(["buyer"], "provided")).toEqual(["buyer"]);
    expect(resolveAssociateDashboardRoles(["seller"], "provided")).toEqual(["seller"]);
    expect(resolveAssociateDashboardRoles(["buyer", "seller"], "provided")).toEqual(["buyer", "seller"]);
  });

  it("maps sought counterpart capabilities to the opposite trade role", () => {
    expect(resolveAssociateDashboardRoles(["seller"], "sought")).toEqual(["buyer"]);
    expect(resolveAssociateDashboardRoles(["buyer"], "sought")).toEqual(["seller"]);
  });

  it("uses mediator activity for service-only profiles", () => {
    expect(resolveAssociateDashboardRoles(["testing", "freight-forwarding"], "provided")).toEqual(["mediator"]);
    expect(resolveAssociateDashboardRoles([], "sought")).toEqual(["mediator"]);
  });
});
