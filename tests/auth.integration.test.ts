import request from "supertest";
import app from "../src/app";
import { createAssociate, createOperator } from "./helpers/authFixtures";

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

  it("rejects associate pending approval", async () => {
    const user = await createAssociate({
      onboardingComplete: true,
      registrationStatus: "PENDING_REVIEW",
    });
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Associate",
    });
    expect(res.status).toBe(401);
  });

  it("rejects operator pending approval", async () => {
    const user = await createOperator({
      onboardingComplete: true,
      registrationStatus: "PENDING_REVIEW",
    });
    const res = await api.post("/api/v1/web/login").send({
      email: user.email,
      password: "Passw0rd!",
      role: "Operator",
    });
    expect(res.status).toBe(401);
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
});
