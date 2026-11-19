import { describe, expect, it } from "vitest";

import { ExecutionMode } from "../src/core/types";
import { operatorAssociateCreatePreWriteHook } from "../src/core/hooks/operatorOnboardingHooks";

const associateRequest = {
  user: { id: "associate-1", role: "Associate" },
};

describe("associate profile update hook", () => {
  it("allows an associate to update their own personal details", async () => {
    const payload = {
      name: "Updated Associate",
      phone: "+917306096941",
      phoneCountryCode: "+91",
      phoneNational: "7306096941",
      address: "Personal address",
      geoType: "INDIAN",
      state: "507f1f77bcf86cd799439011",
      district: "507f191e810c19729de860ea",
    };
    await expect(
      operatorAssociateCreatePreWriteHook(
        payload,
        ExecutionMode.UPDATE,
        "associate-1",
        associateRequest
      )
    ).resolves.toEqual(payload);
  });

  it("blocks updates to another associate", async () => {
    await expect(
      operatorAssociateCreatePreWriteHook(
        { name: "Updated Associate" },
        ExecutionMode.UPDATE,
        "associate-2",
        associateRequest
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("blocks company changes in an associate update", async () => {
    await expect(
      operatorAssociateCreatePreWriteHook(
        { associateCompany: "507f1f77bcf86cd799439011" },
        ExecutionMode.UPDATE,
        "associate-1",
        associateRequest
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("blocks email, designation, and secondary phone changes", async () => {
    await expect(
      operatorAssociateCreatePreWriteHook(
        { email: "changed@example.com", designation: "role-1", phoneSecondary: "+919999999999" },
        ExecutionMode.UPDATE,
        "associate-1",
        associateRequest
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
