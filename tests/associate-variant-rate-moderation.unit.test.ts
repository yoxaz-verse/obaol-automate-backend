import { describe, expect, it, vi } from "vitest";

vi.mock("../src/services/catalogModeration.service", () => ({
  assertAccessibleParent: vi.fn(),
  eligibleApprovedVariantIds: vi.fn(),
  getApprovedAssociateContext: vi.fn(),
  getEnquiryEligibleVariantRateFilter: vi.fn(),
}));

import { ExecutionMode } from "../src/core/types";
import { associateVariantRateModerationPreWriteHook } from "../src/core/hooks/catalogModerationHooks";

const request = { user: { id: "associate-1", role: "Associate" } };

describe("associate variant-rate moderation", () => {
  it("allows an associate to change only their listing publication status", async () => {
    await expect(
      associateVariantRateModerationPreWriteHook(
        { isLive: false },
        ExecutionMode.UPDATE,
        "rate-1",
        request,
      ),
    ).resolves.toEqual({ isLive: false });
  });

  it("keeps catalog revisions behind the proposal workflow", async () => {
    await expect(
      associateVariantRateModerationPreWriteHook(
        { isLive: false, rate: 120 },
        ExecutionMode.UPDATE,
        "rate-1",
        request,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
