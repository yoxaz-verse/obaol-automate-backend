import { afterEach, describe, expect, it } from "vitest";
import { resolvePublicFrontendUrl } from "../src/utils/publicFrontendUrl";

const originalEnvironment = process.env.NODE_ENV;
const originalFrontend = process.env.FRONTEND_URL;

afterEach(() => {
  process.env.NODE_ENV = originalEnvironment;
  if (originalFrontend === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontend;
});

describe("public frontend URL", () => {
  it("uses the canonical configured HTTPS origin", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://obaol.com/";
    expect(resolvePublicFrontendUrl()).toBe("https://obaol.com");
  });

  it("rejects localhost and insecure origins in production", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "http://localhost:3000";
    expect(() => resolvePublicFrontendUrl()).toThrow(/public HTTPS/);
    process.env.FRONTEND_URL = "http://obaol.com";
    expect(() => resolvePublicFrontendUrl()).toThrow(/public HTTPS/);
  });

  it("allows the local frontend during development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.FRONTEND_URL;
    expect(resolvePublicFrontendUrl()).toBe("http://localhost:3000");
  });
});
