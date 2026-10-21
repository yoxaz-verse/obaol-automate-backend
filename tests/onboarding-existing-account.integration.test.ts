import request from "supertest";
import mongoose from "mongoose";
import { vi } from "vitest";
import app from "../src/app";
import { AssociateModel } from "../src/database/models/associate";
import { OperatorModel } from "../src/database/models/operator";
import { VerificationModel } from "../src/database/models/verification";
import { CountryModel } from "../src/database/models/country";
import { createAssociate, createOperator } from "./helpers/authFixtures";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { sendOtpEmail } from "../src/utils/mailer";

vi.mock("../src/utils/mailer", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/mailer")>();
  return { ...original, sendOtpEmail: vi.fn().mockResolvedValue(undefined) };
});

const api = request(app);
const start = (email: string, role: "Associate" | "Operator") =>
  api.post("/api/v1/web/auth/onboarding/start").send({ email, role });

const markEmailVerified = async (user: any, role: "Associate" | "Operator") => {
  user.isEmailVerified = true;
  await user.save();
  await VerificationModel.create({
    userId: String(user._id),
    userType: role,
    method: "email",
    code: "246810",
    expiresAt: new Date(Date.now() + 60_000),
    verified: true,
  });
};

const authCookieFor = (user: any, role: "Associate" | "Operator") => {
  const token = generateJWTToken({ ...user.toObject(), role } as any, "2h");
  return `auth_token=${token}`;
};

describe("onboarding existing accounts", () => {
  beforeEach(() => {
    vi.mocked(sendOtpEmail).mockClear();
  });

  it("starts onboarding for a new email", async () => {
    const email = `new.${new mongoose.Types.ObjectId().toHexString()}@example.com`;
    const response = await start(email, "Associate");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "If this email is eligible, a verification code has been sent." });
    expect(await AssociateModel.exists({ email })).toBeTruthy();
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
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

  it("rejects a completed account without sending signup OTP or exposing its role", async () => {
    const associate = await createAssociate();
    const response = await start(associate.email, "Associate");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      code: "ACCOUNT_EXISTS",
      message: "An account already exists for this email. Please sign in.",
    });
    expect(response.body?.role).toBeUndefined();
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(sendOtpEmail).not.toHaveBeenCalled();
    expect(await VerificationModel.countDocuments({ userId: String(associate._id) })).toBe(0);
    expect(await AssociateModel.exists({ _id: associate._id })).toBeTruthy();
  });

  it("preserves another role's recent draft without returning its role", async () => {
    const associate = await createAssociate({
      onboardingComplete: false,
      isEmailVerified: false,
      createdAt: new Date(),
    });
    const response = await start(associate.email, "Operator");

    expect(response.status).toBe(409);
    expect(response.body?.code).toBe("ACCOUNT_EXISTS");
    expect(response.body?.role).toBeUndefined();
    expect(sendOtpEmail).not.toHaveBeenCalled();
    expect(await AssociateModel.exists({ _id: associate._id })).toBeTruthy();
  });

  it("does not reveal Operator when registering with an Operator email", async () => {
    const operator = await createOperator();
    const response = await start(operator.email, "Associate");

    expect(response.status).toBe(409);
    expect(response.body?.code).toBe("ACCOUNT_EXISTS");
    expect(response.body?.role).toBeUndefined();
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it.each(["Associate", "Operator"] as const)("restarts only a recent unverified same-role %s draft", async (role) => {
    const model = role === "Associate" ? AssociateModel : OperatorModel;
    const create = role === "Associate" ? createAssociate : createOperator;
    const draft = await create({
      onboardingComplete: false,
      isEmailVerified: false,
      authProvider: "LOCAL",
      registrationSource: "SELF_REGISTERED",
      createdAt: new Date(),
    });

    const response = await start(draft.email, role);
    const replacement: any = await model.findOne({ email: draft.email }).lean();

    expect(response.status).toBe(200);
    expect(String(replacement?._id)).not.toBe(String(draft._id));
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(await VerificationModel.countDocuments({ userId: String(replacement?._id), verified: false })).toBe(1);
  });

  it.each(["Associate", "Operator"] as const)("does not restart a verified %s draft", async (role) => {
    const create = role === "Associate" ? createAssociate : createOperator;
    const draft = await create({ onboardingComplete: false, isEmailVerified: true, createdAt: new Date() });

    const response = await start(draft.email, role);

    expect(response.status).toBe(409);
    expect(response.body?.code).toBe("ACCOUNT_EXISTS");
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it("stores an Associate onboarding password once and accepts it at sign-in", async () => {
    const user = await createAssociate({ onboardingComplete: false });
    await markEmailVerified(user, "Associate");
    const password = "FreshPassw0rd!";

    const completed = await api
      .post("/api/v1/web/auth/onboarding")
      .set("Cookie", authCookieFor(user, "Associate"))
      .send({
        role: "Associate",
        name: user.name,
        email: user.email,
        phone: user.phone,
        hasCompany: true,
        companyMode: "existing",
        associateCompanyId: new mongoose.Types.ObjectId(),
        password,
      });

    expect(completed.status).toBe(200);
    const refreshed = await AssociateModel.findById(user._id);
    expect(await refreshed!.comparePassword(password)).toBe(true);

    const incorrect = await api
      .post("/api/v1/web/auth/unified/password")
      .send({ email: user.email, password: "IncorrectPassw0rd!" });
    expect(incorrect.status).toBe(401);
    expect(incorrect.body).toMatchObject({ code: "INVALID_CREDENTIALS" });

    const login = await api
      .post("/api/v1/web/auth/unified/password")
      .send({ email: user.email, password });
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ success: true, user: { role: "Associate" } });
  });

  it("stores an Operator onboarding password once and accepts it at sign-in", async () => {
    const user = await createOperator({ onboardingComplete: false });
    await markEmailVerified(user, "Operator");
    const country = await CountryModel.create({ code: "AE", name: "United Arab Emirates" });
    const password = "FreshPassw0rd!";

    const completed = await api
      .post("/api/v1/web/auth/onboarding")
      .set("Cookie", authCookieFor(user, "Operator"))
      .send({
        role: "Operator",
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        geoType: "INTERNATIONAL",
        country: country._id,
        password,
      });

    expect(completed.status).toBe(200);
    const refreshed = await OperatorModel.findById(user._id);
    expect(await refreshed!.comparePassword(password)).toBe(true);

    const login = await api
      .post("/api/v1/web/auth/unified/password")
      .send({ email: user.email, password });
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ success: true, user: { role: "Operator" } });
  });
});
