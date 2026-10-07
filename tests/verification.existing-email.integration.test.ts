import request from "supertest";
import app from "../src/app";
import { VerificationModel } from "../src/database/models/verification";
import { createAssociate, createOperator } from "./helpers/authFixtures";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { OperatorModel } from "../src/database/models/operator";

const api = request(app);

describe("Verification existing-email flow", () => {
  it("returns blocked response for deleted associate on send-otp-existing", async () => {
    const associate = await createAssociate({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/send-otp-existing").send({
      method: "email",
      email: associate.email,
      role: "Associate",
    });

    expect(res.status).toBe(403);
    expect(res.body?.status).toBe("blocked");
  });

  it("returns blocked response for deleted operator on send-otp-existing", async () => {
    const operator = await createOperator({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/send-otp-existing").send({
      method: "email",
      email: operator.email,
      role: "Operator",
    });

    expect(res.status).toBe(403);
    expect(res.body?.status).toBe("blocked");
  });

  it("returns blocked response for deleted associate on verify-otp-existing", async () => {
    const associate = await createAssociate({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/verify-otp-existing").send({
      method: "email",
      email: associate.email,
      role: "Associate",
      code: "123456",
    });

    expect(res.status).toBe(403);
    expect(res.body?.status).toBe("blocked");
  });

  it("returns blocked response for deleted operator on verify-otp-existing", async () => {
    const operator = await createOperator({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/verify-otp-existing").send({
      method: "email",
      email: operator.email,
      role: "Operator",
      code: "123456",
    });

    expect(res.status).toBe(403);
    expect(res.body?.status).toBe("blocked");
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

  it("rejects an OTP request made through the wrong role portal", async () => {
    const associate = await createAssociate({ isDeleted: false, isActive: true });
    const res = await api.post("/api/v1/web/verification/send-otp-existing").send({
      method: "email",
      email: associate.email,
      role: "Operator",
    });

    expect(res.status).toBe(409);
    expect(res.body?.role).toBe("Associate");
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
