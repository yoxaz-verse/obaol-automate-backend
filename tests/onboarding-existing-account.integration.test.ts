import request from "supertest";
import mongoose from "mongoose";
import { vi } from "vitest";
import app from "../src/app";
import { AssociateModel } from "../src/database/models/associate";
import { OperatorModel } from "../src/database/models/operator";
import { VerificationModel } from "../src/database/models/verification";
import { createAssociate, createOperator } from "./helpers/authFixtures";

vi.mock("../src/utils/mailer", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/mailer")>();
  return { ...original, sendOtpEmail: vi.fn().mockResolvedValue(undefined) };
});

const api = request(app);
const start = (email: string, role: "Associate" | "Operator") =>
  api.post("/api/v1/web/auth/onboarding/start").send({ email, role });

describe("onboarding existing accounts", () => {
  it("starts onboarding for a new email", async () => {
    const email = `new.${new mongoose.Types.ObjectId().toHexString()}@example.com`;
    const response = await start(email, "Associate");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "If this email is eligible, a verification code has been sent." });
    expect(await AssociateModel.exists({ email })).toBeTruthy();
  });

  it.each([
    ["Associate", AssociateModel],
    ["Operator", OperatorModel],
  ] as const)("keeps a new %s restricted until email OTP verification", async (role, model) => {
    const email = `restricted.${role.toLowerCase()}.${new mongoose.Types.ObjectId().toHexString()}@example.com`;
    const started = await start(email, role);
    const restrictedCookie = started.headers["set-cookie"];
    const draft: any = await (model as any).findOne({ email }).lean();

    expect(started.status).toBe(200);
    expect(restrictedCookie?.join(";")).toContain("auth_token=");
    expect((await api.get("/api/v1/web/verify-token").set("Cookie", restrictedCookie)).status).toBe(401);
    expect((await api.post("/api/v1/web/auth/onboarding").set("Cookie", restrictedCookie).send({ role })).status).toBe(401);
    expect((await api.post("/api/v1/web/verification/send-otp").set("Cookie", restrictedCookie).send({})).status).toBe(400);

    await VerificationModel.create({
      userId: String(draft._id),
      userType: role,
      method: "email",
      code: "246810",
      expiresAt: new Date(Date.now() + 60_000),
      verified: false,
    });

    const invalid = await api.post("/api/v1/web/verification/verify-otp")
      .set("Cookie", restrictedCookie)
      .send({ method: "email", code: "000000" });
    expect(invalid.status).toBe(400);
    expect((await api.get("/api/v1/web/verify-token").set("Cookie", restrictedCookie)).status).toBe(401);

    const verified = await api.post("/api/v1/web/verification/verify-otp")
      .set("Cookie", restrictedCookie)
      .send({ method: "email", code: "246810" });
    const authenticatedCookie = verified.headers["set-cookie"];

    expect(verified.status).toBe(200);
    expect(authenticatedCookie?.join(";")).toContain("auth_token=");
    const session = await api.get("/api/v1/web/verify-token").set("Cookie", authenticatedCookie);
    expect(session.status).toBe(200);
    expect(session.body?.user).toMatchObject({ email, role, onboardingComplete: false, verified: { email: true } });
  });

  it("does not disclose the matching role for a completed account", async () => {
    const associate = await createAssociate();
    const response = await start(associate.email, "Associate");

    expect(response.status).toBe(200);
    expect(response.body?.role).toBeUndefined();
    expect(await AssociateModel.exists({ _id: associate._id })).toBeTruthy();
  });

  it("preserves another role's recent draft without returning its role", async () => {
    const associate = await createAssociate({
      onboardingComplete: false,
      isEmailVerified: false,
      createdAt: new Date(),
    });
    const response = await start(associate.email, "Operator");

    expect(response.status).toBe(200);
    expect(response.body?.role).toBeUndefined();
    expect(await AssociateModel.exists({ _id: associate._id })).toBeTruthy();
  });

  it("does not reveal Operator when registering with an Operator email", async () => {
    const operator = await createOperator();
    const response = await start(operator.email, "Associate");

    expect(response.status).toBe(200);
    expect(response.body?.role).toBeUndefined();
  });
});
