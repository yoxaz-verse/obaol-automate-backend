import request from "supertest";
import app from "../src/app";
import { createAssociate, createOperator } from "./helpers/authFixtures";
import { generateJWTToken } from "../src/utils/tokenUtils";

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
