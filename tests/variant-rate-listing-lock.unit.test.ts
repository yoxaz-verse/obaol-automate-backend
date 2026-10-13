import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/database/models/variantRate", () => ({
  VariantRateModel: { findById: vi.fn() },
}));

import { VariantRateModel } from "../src/database/models/variantRate";
import { ExecutionMode } from "../src/core/types";
import {
  VARIANT_RATE_DELETE_WINDOW_MS,
  variantRateListingLockPreWriteHook,
} from "../src/core/hooks/variantRateListingLockHook";

const mockedFindById = vi.mocked(VariantRateModel.findById);
const actor = (role: string) => ({ user: { id: "actor-1", role } });
const listingCreatedAt = (createdAt: Date) => ({
  select: vi.fn().mockReturnValue({
    lean: vi.fn().mockResolvedValue({ _id: "rate-1", createdAt }),
  }),
});

describe("variant-rate listing lock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows non-admin actors to change only live status", async () => {
    await expect(
      variantRateListingLockPreWriteHook(
        { isLive: false },
        ExecutionMode.UPDATE,
        "rate-1",
        actor("Associate"),
      ),
    ).resolves.toEqual({ isLive: false });

    await expect(
      variantRateListingLockPreWriteHook(
        { rate: 125 },
        ExecutionMode.UPDATE,
        "rate-1",
        actor("Operator"),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows non-admin deletion strictly before the one-hour boundary", async () => {
    mockedFindById.mockReturnValueOnce(
      listingCreatedAt(new Date(Date.now() - VARIANT_RATE_DELETE_WINDOW_MS + 1)) as any,
    );

    await expect(
      variantRateListingLockPreWriteHook(
        {},
        ExecutionMode.DELETE,
        "rate-1",
        actor("Team"),
      ),
    ).resolves.toEqual({});
  });

  it("rejects non-admin deletion at and after the one-hour boundary", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    mockedFindById.mockReturnValueOnce(
      listingCreatedAt(new Date(now - VARIANT_RATE_DELETE_WINDOW_MS)) as any,
    );

    await expect(
      variantRateListingLockPreWriteHook(
        {},
        ExecutionMode.DELETE,
        "rate-1",
        actor("Associate"),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("keeps admin maintenance updates and deletion unrestricted", async () => {
    await expect(
      variantRateListingLockPreWriteHook(
        { rate: 200, unit: "KG" },
        ExecutionMode.UPDATE,
        "rate-1",
        actor("Admin"),
      ),
    ).resolves.toEqual({ rate: 200, unit: "KG" });
    await expect(
      variantRateListingLockPreWriteHook(
        {},
        ExecutionMode.DELETE,
        "rate-1",
        actor("Admin"),
      ),
    ).resolves.toEqual({});
    expect(mockedFindById).not.toHaveBeenCalled();
  });
});
