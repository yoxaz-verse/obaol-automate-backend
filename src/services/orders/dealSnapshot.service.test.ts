import { describe, expect, it } from "vitest";
import { buildExternalDealSnapshot, buildOrderWorkspace, validatePaymentPlan } from "./dealSnapshot.service";

describe("order deal snapshots", () => {
  it("validates configured milestone totals", () => {
    expect(validatePaymentPlan({ milestones: [{ label: "Deposit", percent: 30 }, { label: "Balance", percent: 70 }] })).toBeNull();
    expect(validatePaymentPlan({ milestones: [{ label: "Deposit", percent: 30 }] })).toContain("100%");
    expect(validatePaymentPlan({ milestones: [{ label: "", percent: 100 }] })).toContain("label");
  });

  it("creates a normalized external-order snapshot", () => {
    const snapshot: any = buildExternalDealSnapshot({ externalBuyer: { name: "Buyer" }, externalSeller: { name: "Supplier" }, externalProduct: { name: "Pepper", quantity: 10, unit: "KG" } });
    expect(snapshot.snapshotVersion).toBe(1);
    expect(snapshot.provenance).toBe("EXTERNAL_ORDER");
    expect(snapshot.product.name).toBe("Pepper");
  });

  it("summarizes payment progress for the workspace response", () => {
    const workspace = buildOrderWorkspace({ workflowStage: "PRODUCTION", paymentPlan: { milestones: [{ percent: 40, status: "PAID" }, { percent: 20, status: "DUE" }] } }, "admin");
    expect(workspace.paymentProgress).toEqual({ paidPercent: 40, duePercent: 20, milestoneCount: 2 });
    expect(workspace.permissions.canManagePayments).toBe(true);
  });
});
