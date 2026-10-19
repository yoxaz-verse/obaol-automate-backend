import request from "supertest";
import { vi } from "vitest";
import app from "../src/app";
import { VerificationModel } from "../src/database/models/verification";
import { createAssociate, createOperator } from "./helpers/authFixtures";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { OperatorModel } from "../src/database/models/operator";

vi.mock("../src/utils/mailer", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/mailer")>();
  return { ...original, sendOtpEmail: vi.fn().mockResolvedValue(undefined) };
});

const api = request(app);

describe("Verification existing-email flow", () => {
  it("returns the neutral response for a deleted associate on send-otp-existing", async () => {
    const associate = await createAssociate({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/send-otp-existing").send({
      method: "email",
      email: associate.email,
      role: "Associate",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "If this email is eligible, a verification code has been sent." });
  });

  it("returns the neutral response for a deleted operator on send-otp-existing", async () => {
    const operator = await createOperator({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/send-otp-existing").send({
      method: "email",
      email: operator.email,
      role: "Operator",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "If this email is eligible, a verification code has been sent." });
  });

  it("does not reveal a deleted associate before OTP ownership is proven", async () => {
    const associate = await createAssociate({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/verify-otp-existing").send({
      method: "email",
      email: associate.email,
      role: "Associate",
      code: "123456",
    });

    expect(res.status).toBe(400);
    expect(res.body?.code).toBe("OTP_EXPIRED");
  });

  it("does not reveal a deleted operator before OTP ownership is proven", async () => {
    const operator = await createOperator({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/verify-otp-existing").send({
      method: "email",
      email: operator.email,
      role: "Operator",
      code: "123456",
    });

    expect(res.status).toBe(400);
    expect(res.body?.code).toBe("OTP_EXPIRED");
  });

  it("signs an approved associate in after successful OTP verification", async () => {
    const associate = await createAssociate({
      onboardingComplete: true,
      registrationStatus: "APPROVED",
      isDeleted: false,
      isActive: true,
    });

    await VerificationModel.create({
      userId: String(associate._id),
      userType: "Associate",
      method: "email",
      code: "654321",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      verified: false,
    });

    const res = await api.post("/api/v1/web/verification/verify-otp-existing").send({
      method: "email",
      email: associate.email,
      role: "Associate",
      code: "654321",
    });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.next).toBe("/dashboard");
    expect(res.headers["set-cookie"]?.join(";")).toContain("auth_token=");
  });

  it("signs an approved operator in with a remembered session after successful OTP verification", async () => {
    const operator = await createOperator({
      onboardingComplete: true,
      registrationStatus: "APPROVED",
      isDeleted: false,
      isActive: true,
    });

    await VerificationModel.create({
      userId: String(operator._id),
      userType: "Operator",
      method: "email",
      code: "987654",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      verified: false,
    });

    const res = await api.post("/api/v1/web/verification/verify-otp-existing").send({
      method: "email",
      email: operator.email,
      role: "Operator",
      code: "987654",
      rememberMe: true,
    });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.next).toBe("/dashboard");
    expect(res.headers["set-cookie"]?.join(";")).toContain("auth_token=");
    expect(res.headers["set-cookie"]?.join(";")).toMatch(/Max-Age=86400/i);
  });

  it("ignores an untrusted role hint and returns a neutral OTP response", async () => {
    const associate = await createAssociate({ isDeleted: false, isActive: true });
    const res = await api.post("/api/v1/web/verification/send-otp-existing").send({
      method: "email",
      email: associate.email,
      role: "Operator",
    });

    expect(res.status).toBe(200);
    expect(res.body?.role).toBeUndefined();
  });

  it("persists operator email verification after authenticated OTP verify", async () => {
    const operator = await createOperator({
      onboardingComplete: false,
      registrationStatus: "PENDING_REVIEW",
      isEmailVerified: false,
    });
    await VerificationModel.create({
      userId: String(operator._id),
      userType: "Operator",
      method: "email",
      code: "112233",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      verified: false,
    });
    const token = generateJWTToken({ _id: operator._id, email: operator.email, role: "Operator" } as any, "2h");

    const res = await api
      .post("/api/v1/web/verification/verify-otp")
      .set("Cookie", `auth_token=${token}`)
      .send({ method: "email", code: "112233" });

    expect(res.status).toBe(200);
    const updated = await OperatorModel.findById(operator._id).lean();
    expect(updated?.isEmailVerified).toBe(true);
  });
});
