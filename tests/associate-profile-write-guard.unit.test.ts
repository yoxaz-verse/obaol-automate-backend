import { describe, expect, it } from "vitest";

import { operatorAssociateCreatePreWriteHook } from "../src/core/hooks/operatorOnboardingHooks";
import { ExecutionMode } from "../src/core/types";

const protectedFields = [
  "isActive",
  "isCompanyVerified",
  "isEmailVerified",
  "registrationStatus",
];

describe("associate profile write guard", () => {
  for (const role of ["Associate", "Customer", "Operator", "Team"]) {
    for (const field of protectedFields) {
      it(`rejects ${field} updates from ${role}`, async () => {
        await expect(
          operatorAssociateCreatePreWriteHook(
            { [field]: field === "registrationStatus" ? "APPROVED" : true },
            ExecutionMode.UPDATE,
            "associate-id",
            { user: { id: "actor-id", role } }
          )
        ).rejects.toMatchObject({ statusCode: 403 });
      });
    }
  }

  it("allows associates to update ordinary profile fields", async () => {
    const payload = {
      phone: "+919876543210",
      designation: "designation-id",
      associateCompany: "company-id",
      onboardingContactPreference: "EMAIL",
    };

    await expect(
      operatorAssociateCreatePreWriteHook(
        payload,
        ExecutionMode.UPDATE,
        "associate-id",
        { user: { id: "associate-id", role: "Associate" } }
      )
    ).resolves.toEqual(payload);
  });

  it("allows admins to update verification and approval fields", async () => {
    const payload = {
      isActive: true,
      isCompanyVerified: true,
      isEmailVerified: true,
      registrationStatus: "APPROVED",
    };

    await expect(
      operatorAssociateCreatePreWriteHook(
        payload,
        ExecutionMode.UPDATE,
        "associate-id",
        { user: { id: "admin-id", role: "Admin" } }
      )
    ).resolves.toEqual(payload);
  });
});
