import { describe, expect, it } from "vitest";
import {
  PERSISTENT_SESSION_DURATION_MS,
  isPersistentSessionToken,
  shouldRenewPersistentSession,
} from "../src/utils/authSessionPolicy";

describe("persistent authentication session policy", () => {
  it("recognizes explicit and legacy remember-me tokens", () => {
    expect(isPersistentSessionToken({ persistent: true, iat: 100, exp: 200 })).toBe(true);
    expect(isPersistentSessionToken({ iat: 100, exp: 100 + 24 * 60 * 60 })).toBe(true);
    expect(isPersistentSessionToken({ iat: 100, exp: 100 + 2 * 60 * 60 })).toBe(false);
  });

  it("renews only when a persistent token has seven days or less remaining", () => {
    const now = Date.UTC(2026, 10, 1);
    expect(shouldRenewPersistentSession({ persistent: true, exp: (now + 6 * 24 * 60 * 60 * 1000) / 1000 }, now)).toBe(true);
    expect(shouldRenewPersistentSession({ persistent: true, exp: (now + 8 * 24 * 60 * 60 * 1000) / 1000 }, now)).toBe(false);
    expect(shouldRenewPersistentSession({ exp: (now + 60 * 60 * 1000) / 1000, iat: now / 1000 }, now)).toBe(false);
  });

  it("uses a thirty-day persistent lifetime", () => {
    expect(PERSISTENT_SESSION_DURATION_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
