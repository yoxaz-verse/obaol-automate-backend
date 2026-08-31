import request from "supertest";
import { vi } from "vitest";
import app from "../src/app";
import { createAdmin, createAssociate, createOperator } from "./helpers/authFixtures";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { verifyGoogleIdToken } from "../src/utils/googleAuth";
import { VerificationModel } from "../src/database/models/verification";
import { AuthPasskeyModel } from "../src/database/models/authPasskey";

const webAuthnMocks = vi.hoisted(() => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("../src/utils/googleAuth", () => ({
  verifyGoogleIdToken: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: webAuthnMocks.generateRegistrationOptions,
  verifyRegistrationResponse: webAuthnMocks.verifyRegistrationResponse,
  generateAuthenticationOptions: webAuthnMocks.generateAuthenticationOptions,
  verifyAuthenticationResponse: webAuthnMocks.verifyAuthenticationResponse,
}));

const api = request(app);

const extractAuthCookie = (setCookieHeader?: string[] | string) => {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const authCookie = cookies.find((cookie) => cookie.startsWith("auth_token="));
  if (!authCookie) return null;
  const match = authCookie.match(/auth_token=([^;]+)/);
  return match ? match[1] : null;
};

const extractMaxAge = (setCookieHeader?: string[] | string) => {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const authCookie = cookies.find((cookie) => cookie.startsWith("auth_token="));
  if (!authCookie) return null;
  const match = authCookie.match(/Max-Age=([0-9]+)/i);
  return match ? Number(match[1]) : null;
};

describe("Auth API", () => {
  it("rejects missing email/password", async () => {
    const res = await api.post("/api/v1/web/login").send({});
    expect(res.status).toBe(400);
  });

  it("rejects invalid credentials", async () => {
    const user = await createAssociate();
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "wrong",
      role: "Associate",
    });
    expect(res.status).toBe(401);
  });

  it("keeps associate password failures as 401 before cooldown threshold", async () => {
    const user = await createAssociate();

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await api.post("/api/v1/web/login").send({
        email: user.email,
        password: `wrong-${attempt}`,
        role: "Associate",
      });
      expect(res.status).toBe(401);
      expect(res.body?.code).not.toBe("LOGIN_COOLDOWN");
    }
  });

  it("locks associate password login for five minutes after 5 failed attempts", async () => {
    const user = await createAssociate();
    let res: request.Response | null = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      res = await api.post("/api/v1/web/login").send({
        email: user.email,
        password: `wrong-${attempt}`,
        role: "Associate",
      });
    }

    expect(res?.status).toBe(429);
    expect(res?.body).toMatchObject({
      success: false,
      code: "LOGIN_COOLDOWN",
      failedAttempts: 5,
      maxAttempts: 5,
    });
    expect(res?.body?.retryAfterSeconds).toBeGreaterThan(0);
    expect(res?.body?.retryAfterSeconds).toBeLessThanOrEqual(300);
    expect(Date.parse(res?.body?.lockedUntil)).not.toBeNaN();
  });

  it("returns cooldown while locked even when the password is later correct", async () => {
    const user = await createAssociate({
      failedLoginAttempts: 5,
      loginLockedUntil: new Date(Date.now() + 90 * 1000),
    });

    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Associate",
    });

    expect(res.status).toBe(429);
    expect(res.body?.code).toBe("LOGIN_COOLDOWN");
    expect(res.body?.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("allows correct associate password after cooldown and resets counters", async () => {
    const user = await createAssociate({
      failedLoginAttempts: 5,
      loginLockedUntil: new Date(Date.now() - 1000),
      lastFailedLoginAt: new Date(Date.now() - 180 * 1000),
    });

    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Associate",
    });

    expect(res.status).toBe(200);
    const refreshed = await user.constructor.findById(user._id).lean();
    expect(refreshed?.failedLoginAttempts).toBe(0);
    expect(refreshed?.loginLockedUntil).toBeNull();
    expect(refreshed?.lastFailedLoginAt).toBeNull();
  });

  it("applies the same password cooldown to operators", async () => {
    const user = await createOperator();
    let res: request.Response | null = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      res = await api.post("/api/v1/web/login").send({
        email: user.email,
        password: `wrong-${attempt}`,
        role: "Operator",
      });
    }

    expect(res?.status).toBe(429);
    expect(res?.body?.code).toBe("LOGIN_COOLDOWN");
    expect(res?.body?.failedAttempts).toBe(5);
  });

  it("applies progressive password cooldown to admins", async () => {
    const user = await createAdmin();
    let res: request.Response | null = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      res = await api.post("/api/v1/web/login").send({
        email: user.email,
        password: `wrong-${attempt}`,
        role: "Admin",
      });
    }

    expect(res?.status).toBe(429);
    expect(res?.body?.code).toBe("LOGIN_COOLDOWN");
    expect(res?.body?.lockoutLevel).toBe(1);

    await user.constructor.findByIdAndUpdate(user._id, {
      failedLoginAttempts: 4,
      loginLockoutLevel: 1,
      loginLockedUntil: null,
    });
    const secondLock = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "wrong-again",
      role: "Admin",
    });
    expect(secondLock.status).toBe(429);
    expect(secondLock.body?.lockoutLevel).toBe(2);
    expect(secondLock.body?.retryAfterSeconds).toBeGreaterThan(300);
  });

  it("does not apply password cooldown to Google login", async () => {
    const user = await createAssociate({
      authProvider: "GOOGLE",
      googleSub: "google-sub-1",
      googleEmailVerified: true,
      isEmailVerified: true,
      failedLoginAttempts: 5,
      loginLockedUntil: new Date(Date.now() + 90 * 1000),
    });
    vi.mocked(verifyGoogleIdToken).mockResolvedValueOnce({
      email: user.email,
      name: user.name,
      sub: "google-sub-1",
      email_verified: true,
    });

    const res = await api.post("/api/v1/web/auth/google").send({
      idToken: "test-google-token",
      role: "Associate",
      intent: "login",
    });

    expect(res.status).toBe(200);
    expect(res.body?.user?.email).toBe(user.email);
  });

  it("rejects inactive user", async () => {
    const user = await createAssociate({ isActive: false });
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Associate",
    });
    expect(res.status).toBe(401);
  });

  it("allows associate pending approval login for pending-approval routing", async () => {
    const user = await createAssociate({
      onboardingComplete: true,
      registrationStatus: "PENDING_REVIEW",
    });
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Associate",
    });
    expect(res.status).toBe(200);
    expect(res.body?.user?.registrationStatus).toBe("PENDING_REVIEW");
  });

  it("allows operator pending approval login for pending-approval routing", async () => {
    const user = await createOperator({
      onboardingComplete: true,
      registrationStatus: "PENDING_REVIEW",
    });
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Operator",
    });
    expect(res.status).toBe(200);
    expect(res.body?.user?.registrationStatus).toBe("PENDING_REVIEW");
  });

  it("logs in associate and sets auth cookie", async () => {
    const user = await createAssociate();
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Associate",
    });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    const token = extractAuthCookie(res.headers["set-cookie"]);
    expect(token).toBeTruthy();
    expect(res.body?.user?.email).toBe(user.email);
    expect(res.body?.user?.role).toBe("Associate");
  });

  it("logs in operator and sets auth cookie", async () => {
    const user = await createOperator();
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Operator",
    });

    expect(res.status).toBe(200);
    const token = extractAuthCookie(res.headers["set-cookie"]);
    expect(token).toBeTruthy();
    expect(res.body?.user?.email).toBe(user.email);
  });

  it("sets longer cookie max-age when rememberMe is true", async () => {
    const user = await createAssociate();
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Associate",
      rememberMe: true,
    });

    expect(res.status).toBe(200);
    const maxAge = extractMaxAge(res.headers["set-cookie"]);
    expect(maxAge).not.toBeNull();
    if (maxAge !== null) {
      expect(maxAge).toBeGreaterThanOrEqual(86000);
    }
  });

  it("rejects verify-token without token", async () => {
    const res = await api.get("/api/v1/web/verify-token");
    expect(res.status).toBe(401);
  });

  it("verifies token from login cookie", async () => {
    const user = await createAssociate();
    const loginRes = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Associate",
    });

    const token = extractAuthCookie(loginRes.headers["set-cookie"]);
    expect(token).toBeTruthy();

    const res = await api
      .get("/api/v1/web/verify-token")
      .set("Cookie", `auth_token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body?.user?.email).toBe(user.email);
    expect(res.body?.user?.role).toBe("Associate");
  });

  it("verifies token for operator role without error", async () => {
    const user = await createOperator();
    const loginRes = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Operator",
    });

    const token = extractAuthCookie(loginRes.headers["set-cookie"]);
    expect(token).toBeTruthy();

    const res = await api
      .get("/api/v1/web/verify-token")
      .set("Cookie", `auth_token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body?.user?.role).toBeDefined();
  });

  it("requires password and OTP before starting passkey registration", async () => {
    const user = await createAssociate();
    const token = generateJWTToken({ _id: user._id, email: user.email, role: "Associate" } as any, "2h");

    const res = await api
      .post("/api/v1/web/auth/passkeys/registration/options")
      .set("Cookie", `auth_token=${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body?.message).toMatch(/Password and email OTP/i);
  });

  it("registers a passkey only after server verification", async () => {
    const user = await createAssociate();
    const token = generateJWTToken({ _id: user._id, email: user.email, role: "Associate" } as any, "2h");
    await VerificationModel.create({
      userId: String(user._id),
      userType: "Associate",
      method: "email",
      code: "123456",
      expiresAt: new Date(Date.now() + 60_000),
      ipAddress: "127.0.0.1",
      userAgent: "test",
      verified: false,
    });
    webAuthnMocks.generateRegistrationOptions.mockResolvedValueOnce({
      challenge: "registration-challenge",
      user: { id: "webauthn-user-id" },
    });
    webAuthnMocks.verifyRegistrationResponse.mockResolvedValueOnce({
      verified: true,
      registrationInfo: {
        credential: {
          id: "credential-1",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "singleDevice",
        credentialBackedUp: false,
      },
    });

    const optionsRes = await api
      .post("/api/v1/web/auth/passkeys/registration/options")
      .set("Cookie", `auth_token=${token}`)
      .send({ password: "Passw0rd!", otpCode: "123456", deviceLabel: "Laptop" });
    expect(optionsRes.status).toBe(200);

    const verifyRes = await api
      .post("/api/v1/web/auth/passkeys/registration/verify")
      .set("Cookie", `auth_token=${token}`)
      .send({ response: { id: "credential-1", response: {} }, deviceLabel: "Laptop" });

    expect(verifyRes.status).toBe(200);
    const stored = await AuthPasskeyModel.findOne({ credentialId: "credential-1" }).lean();
    expect(stored?.deviceLabel).toBe("Laptop");
    expect(webAuthnMocks.verifyRegistrationResponse).toHaveBeenCalledWith(expect.objectContaining({
      expectedChallenge: "registration-challenge",
      requireUserVerification: true,
    }));
  });

  it("logs in with an existing passkey and updates its counter", async () => {
    const user = await createAssociate();
    await AuthPasskeyModel.create({
      userId: user._id,
      role: "Associate",
      credentialId: "credential-login",
      webAuthnUserId: "webauthn-user-id",
      publicKey: Buffer.from(new Uint8Array([1, 2, 3])).toString("base64url"),
      counter: 1,
      transports: ["internal"],
      deviceLabel: "Laptop",
    });
    webAuthnMocks.generateAuthenticationOptions.mockResolvedValueOnce({ challenge: "auth-challenge" });
    webAuthnMocks.verifyAuthenticationResponse.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    });

    const optionsRes = await api.post("/api/v1/web/auth/passkeys/authentication/options").send({
      email: user.email,
      role: "Associate",
    });
    expect(optionsRes.status).toBe(200);

    const verifyRes = await api.post("/api/v1/web/auth/passkeys/authentication/verify").send({
      email: user.email,
      role: "Associate",
      response: { id: "credential-login", response: {} },
    });

    expect(verifyRes.status).toBe(200);
    expect(extractAuthCookie(verifyRes.headers["set-cookie"])).toBeTruthy();
    const stored = await AuthPasskeyModel.findOne({ credentialId: "credential-login" }).lean();
    expect(stored?.counter).toBe(2);
  });

  it("blocks associate onboarding completion until email OTP is verified", async () => {
    const user = await createAssociate({
      onboardingComplete: false,
      registrationStatus: "PENDING_REVIEW",
      isEmailVerified: false,
      hasCompany: false,
      companyMode: "none",
    });
    const token = generateJWTToken({ _id: user._id, email: user.email, role: "Associate" } as any, "2h");

    const res = await api
      .post("/api/v1/web/auth/onboarding")
      .set("Cookie", `auth_token=${token}`)
      .send({
        role: "Associate",
        name: user.name,
        email: user.email,
        phone: user.phone,
        hasCompany: true,
        tradeMode: "BOTH",
      });

    expect(res.status).toBe(400);
    expect(res.body?.message).toMatch(/verify your email OTP/i);
  });

  it("blocks operator onboarding completion until email OTP is verified", async () => {
    const user = await createOperator({
      onboardingComplete: false,
      registrationStatus: "PENDING_REVIEW",
      isEmailVerified: false,
    });
    const token = generateJWTToken({ _id: user._id, email: user.email, role: "Operator" } as any, "2h");

    const res = await api
      .post("/api/v1/web/auth/onboarding")
      .set("Cookie", `auth_token=${token}`)
      .send({
        role: "Operator",
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
      });

    expect(res.status).toBe(400);
    expect(res.body?.message).toMatch(/verify your email OTP/i);
  });
});
