import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/core/hooks/operatorScope", () => ({
  getOperatorCompanyScope: vi.fn(),
}));

vi.mock("../src/database/models/variantRate", () => ({
  VariantRateModel: {
    findById: vi.fn(),
  },
}));

import { ExecutionMode } from "../src/core/types";
import { operatorFilterHook } from "../src/core/hooks/operatorAccessHooks";
import { operatorVariantRateWritePreHook } from "../src/core/hooks/operatorVariantRateWriteHook";
import { getOperatorCompanyScope } from "../src/core/hooks/operatorScope";
import { VariantRateModel } from "../src/database/models/variantRate";

const mockedScope = vi.mocked(getOperatorCompanyScope);
const mockedFindById = vi.mocked(VariantRateModel.findById);

describe("operator scope hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes associate reads to downline-assigned companies", async () => {
    mockedScope.mockResolvedValueOnce({
      operatorIds: ["operator-main", "operator-downline"],
      companyIds: ["company-a", "company-b"] as any,
      companyIdSet: new Set(["company-a", "company-b"]),
    });

    const scoped = await operatorFilterHook(
      {},
      "read" as any,
      undefined,
      {
        user: { id: "operator-main", role: "operator" },
        params: { entity: "associates" },
        query: {},
      }
    );

    expect(scoped).toEqual({
      associateCompany: { $in: ["company-a", "company-b"] },
    });
  });

  it("returns empty query when explicit associateCompany is outside operator scope", async () => {
    mockedScope.mockResolvedValueOnce({
      operatorIds: ["operator-main", "operator-downline"],
      companyIds: ["company-a"] as any,
      companyIdSet: new Set(["company-a"]),
    });

    const scoped = await operatorFilterHook(
      { associateCompany: "company-z" },
      "read" as any,
      undefined,
      {
        user: { id: "operator-main", role: "team" },
        params: { entity: "variant-rates" },
        query: {},
      }
    );

    expect(scoped).toEqual({ _id: "000000000000000000000000" });
  });

  it("allows creating rates for downline-assigned company", async () => {
    mockedScope.mockResolvedValueOnce({
      operatorIds: ["operator-main", "operator-downline"],
      companyIds: ["company-downline"] as any,
      companyIdSet: new Set(["company-downline"]),
    });

    const payload = { associateCompany: "company-downline", rate: 100 };
    await expect(
      operatorVariantRateWritePreHook(
        payload as any,
        ExecutionMode.CREATE,
        undefined,
        { user: { id: "operator-main", role: "operator" } }
      )
    ).resolves.toEqual(payload);
  });

  it("blocks creating rates for out-of-scope company", async () => {
    mockedScope.mockResolvedValueOnce({
      operatorIds: ["operator-main", "operator-downline"],
      companyIds: ["company-downline"] as any,
      companyIdSet: new Set(["company-downline"]),
    });

    await expect(
      operatorVariantRateWritePreHook(
        { associateCompany: "company-unrelated" } as any,
        ExecutionMode.CREATE,
        undefined,
        { user: { id: "operator-main", role: "operator" } }
      )
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows updating existing rate owned by downline-assigned company", async () => {
    mockedScope.mockResolvedValueOnce({
      operatorIds: ["operator-main", "operator-downline"],
      companyIds: ["company-downline"] as any,
      companyIdSet: new Set(["company-downline"]),
    });
    mockedFindById.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ associateCompany: "company-downline" }),
      }),
    } as any);

    await expect(
      operatorVariantRateWritePreHook(
        { rate: 150 } as any,
        ExecutionMode.UPDATE,
        "rate-1",
        { user: { id: "operator-main", role: "team" } }
      )
    ).resolves.toEqual({ rate: 150 });
  });
});
