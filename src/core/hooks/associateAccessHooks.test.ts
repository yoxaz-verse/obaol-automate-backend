import { afterEach, describe, expect, it, vi } from "vitest";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { associateCompanyCapabilityFilterHook } from "./associateAccessHooks";

describe("associate company capability filtering", () => {
  afterEach(() => vi.restoreAllMocks());

  it("scopes admin associate lists to provider companies and preserves other filters", async () => {
    const distinct = vi.spyOn(AssociateCompanyModel, "distinct").mockResolvedValue(["company-1", "company-2"] as any);

    const result = await associateCompanyCapabilityFilterHook(
      { companyCapability: "freight-forwarding", registrationStatus: "APPROVED" },
      "read",
      undefined,
      { user: { role: "Admin" }, query: { companyCapability: "freight-forwarding" } },
    );

    expect(distinct).toHaveBeenCalledWith("_id", {
      providedCapabilities: "freight-forwarding",
      isDeleted: { $ne: true },
    });
    expect(result).toEqual({
      $and: [
        { registrationStatus: "APPROVED" },
        { associateCompany: { $in: ["company-1", "company-2"] } },
      ],
    });
  });

  it("rejects capability-filtered associate lists for non-admin roles", async () => {
    await expect(associateCompanyCapabilityFilterHook(
      { companyCapability: "freight-forwarding" },
      "read",
      undefined,
      { user: { role: "Operator" }, query: { companyCapability: "freight-forwarding" } },
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  it("does not treat sought capabilities as provider eligibility", async () => {
    const distinct = vi.spyOn(AssociateCompanyModel, "distinct").mockResolvedValue([] as any);

    const result = await associateCompanyCapabilityFilterHook(
      { companyCapability: "freight-forwarding" },
      "read",
      undefined,
      { user: { role: "Admin" }, query: { companyCapability: "freight-forwarding" } },
    );

    expect(distinct).toHaveBeenCalledWith("_id", expect.objectContaining({ providedCapabilities: "freight-forwarding" }));
    expect(result).toEqual({ associateCompany: { $in: [] } });
  });
});
