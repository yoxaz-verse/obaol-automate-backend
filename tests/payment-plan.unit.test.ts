import { describe, expect, it } from "vitest";
import { buildPaymentPlan } from "../src/utils/paymentPlan";

describe("payment plan builder", () => {
  it("supports an unlimited ordered schedule and assigns the rounding remainder to the final section", () => {
    const milestones = Array.from({ length: 6 }, (_, index) => ({
      label: `Section ${index + 1}`,
      percent: index === 5 ? 15 : 17,
      triggerType: "STAGE",
      triggerValue: `STAGE_${index + 1}`,
    }));

    const plan = buildPaymentPlan(
      { milestones },
      "INTERNATIONAL",
      { totalValue: 100.01, currency: "USD" },
    );

    expect(plan?.milestones).toHaveLength(6);
    expect(plan?.milestones.map((item) => item.label)).toEqual(milestones.map((item) => item.label));
    expect(plan?.milestones.reduce((sum, item) => sum + Number(item.amount || 0), 0)).toBeCloseTo(100.01, 2);
    expect(plan?.milestones.every((item) => item.currency === "USD")).toBe(true);
  });

  it("keeps amounts nullable when the commercial total is not available", () => {
    const plan = buildPaymentPlan({ milestones: [{ label: "Advance", percent: 100, triggerType: "DOC", triggerValue: "PROFORMA_INVOICE" }] });
    expect(plan?.milestones[0]).toMatchObject({ amount: null, currency: "INR", percent: 100 });
  });
});
