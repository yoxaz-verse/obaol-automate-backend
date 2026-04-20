import request from "supertest";
import app from "../src/app";
import { VerificationModel } from "../src/database/models/verification";
import { createAssociate, createOperator } from "./helpers/authFixtures";

const api = request(app);

describe("Verification existing-email flow", () => {
  it("returns blocked response for deleted associate on send-otp-existing", async () => {
    const associate = await createAssociate({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/send-otp-existing").send({
      method: "email",
      email: associate.email,
    });

    expect(res.status).toBe(403);
    expect(res.body?.status).toBe("blocked");
  });

  it("returns blocked response for deleted operator on send-otp-existing", async () => {
    const operator = await createOperator({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/send-otp-existing").send({
      method: "email",
      email: operator.email,
    });

    expect(res.status).toBe(403);
    expect(res.body?.status).toBe("blocked");
  });

  it("returns blocked response for deleted associate on verify-otp-existing", async () => {
    const associate = await createAssociate({ isDeleted: true });
    const res = await api.post("/api/v1/web/verification/verify-otp-existing").send({
      method: "email",
      email: associate.email,
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
      code: "123456",
    });

    expect(res.status).toBe(403);
    expect(res.body?.status).toBe("blocked");
  });

  it("routes approved associate to /auth after successful OTP verify", async () => {
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
      code: "654321",
    });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.next).toBe("/auth");
  });

  it("routes approved operator to /auth/operator after successful OTP verify", async () => {
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
      code: "987654",
    });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.next).toBe("/auth/operator");
  });
});
