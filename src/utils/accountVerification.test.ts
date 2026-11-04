import { afterEach, describe, expect, it } from "vitest";
import { accountVerificationStatus } from "./accountVerification";

const originalRollout = process.env.ACCOUNT_VERIFICATION_ROLLOUT_AT;
const originalGrace = process.env.ACCOUNT_VERIFICATION_GRACE_DAYS;

afterEach(() => {
  if (originalRollout === undefined) delete process.env.ACCOUNT_VERIFICATION_ROLLOUT_AT; else process.env.ACCOUNT_VERIFICATION_ROLLOUT_AT = originalRollout;
  if (originalGrace === undefined) delete process.env.ACCOUNT_VERIFICATION_GRACE_DAYS; else process.env.ACCOUNT_VERIFICATION_GRACE_DAYS = originalGrace;
});

describe("accountVerificationStatus", () => {
  it("requires both channels for full verification", () => {
    const status = accountVerificationStatus({ email: "person@example.com", phone: "+919876543210", isEmailVerified: true, isPhoneVerified: false });
    expect(status.fullyVerified).toBe(false);
    expect(status.requiredNextChannel).toBe("whatsapp");
    expect(status.maskedEmail).toBe("pe***@example.com");
    expect(status.maskedPhone.endsWith("3210")).toBe(true);
  });

  it("hard-gates new accounts from the configured rollout", () => {
    process.env.ACCOUNT_VERIFICATION_ROLLOUT_AT = "2025-01-01T00:00:00.000Z";
    process.env.ACCOUNT_VERIFICATION_GRACE_DAYS = "30";
    const status = accountVerificationStatus({ createdAt: "2025-01-02T00:00:00.000Z", isEmailVerified: true, isPhoneVerified: false });
    expect(status.verificationRequired).toBe(true);
    expect(status.verificationGraceEndsAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("does not gate when the rollout is not configured", () => {
    delete process.env.ACCOUNT_VERIFICATION_ROLLOUT_AT;
    const status = accountVerificationStatus({ createdAt: new Date(), isEmailVerified: false, isPhoneVerified: false });
    expect(status.verificationRequired).toBe(false);
    expect(status.verificationGraceEndsAt).toBeNull();
  });
});
