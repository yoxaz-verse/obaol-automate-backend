import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/database/models/associateCompany", () => ({
  AssociateCompanyModel: {
    exists: vi.fn(),
  },
}));

import { ExecutionMode } from "../src/core/types";
import { operatorAssociateCreatePreWriteHook } from "../src/core/hooks/operatorOnboardingHooks";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";

const companyId = "507f1f77bcf86cd799439011";
const associateRequest = {
  user: { id: "associate-1", role: "Associate" },
};

describe("associate profile update hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows an associate to change only their own approved company", async () => {
    vi.mocked(AssociateCompanyModel.exists).mockResolvedValueOnce({ _id: companyId } as any);

    await expect(
      operatorAssociateCreatePreWriteHook(
        { associateCompany: companyId },
        ExecutionMode.UPDATE,
        "associate-1",
        associateRequest
      )
    ).resolves.toEqual({ associateCompany: companyId });

    expect(AssociateCompanyModel.exists).toHaveBeenCalledWith({
      _id: companyId,
      registrationStatus: "APPROVED",
      isApproved: true,
      isDeleted: { $ne: true },
      isExternalDirectoryListing: { $ne: true },
    });
  });

  it("blocks updates to another associate", async () => {
    await expect(
      operatorAssociateCreatePreWriteHook(
        { associateCompany: companyId },
        ExecutionMode.UPDATE,
        "associate-2",
        associateRequest
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("blocks personal fields in an associate update", async () => {
    await expect(
      operatorAssociateCreatePreWriteHook(
        { associateCompany: companyId, name: "Changed" },
        ExecutionMode.UPDATE,
        "associate-1",
        associateRequest
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects a company that is not approved and available", async () => {
    vi.mocked(AssociateCompanyModel.exists).mockResolvedValueOnce(null);

    await expect(
      operatorAssociateCreatePreWriteHook(
        { associateCompany: companyId },
        ExecutionMode.UPDATE,
        "associate-1",
        associateRequest
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
