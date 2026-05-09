import { describe, expect, it, vi } from "vitest";

const baseEnv = {
  PORT: "5001",
  MONGODB_URI: "mongodb://127.0.0.1:27017/testdb",
  UPLOAD_DIR: "uploads",
  BASE_URL: "http://localhost:3000",
  JWT_SECRET: "test-secret-123",
  SMTP_HOST: "chocobo.mxrouting.net",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_AUTH_PASSWORD: "test-password",
  SMTP_AUTH_USER: "no-reply@auth.obaol.com",
  SMTP_NOTIFY_USER: "no-reply@notify.obaol.com",
  SMTP_SUPPORT_USER: "info@support.obaol.com",
};

describe("validateEnv SMTP requirements", () => {
  it("loads successfully with required SMTP env vars", async () => {
    vi.resetModules();
    Object.assign(process.env, baseEnv);

    const mod = await import("../src/config/validateEnv");
    expect(mod.default.SMTP_HOST).toBe("chocobo.mxrouting.net");
  });

  it("throws when SMTP_HOST is missing", async () => {
    vi.resetModules();
    Object.assign(process.env, baseEnv);
    delete process.env.SMTP_HOST;

    await expect(import("../src/config/validateEnv")).rejects.toThrow(
      /Config validation error/i
    );
  });
});
