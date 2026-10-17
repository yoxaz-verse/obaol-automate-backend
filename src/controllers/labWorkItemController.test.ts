import { describe, expect, it } from "vitest";
import { isValidLabCustodyTransition } from "./labWorkItemController";

describe("lab sample custody transitions", () => {
  it("allows only the forward custody sequence", () => {
    expect(isValidLabCustodyTransition("EXPECTED", "RECEIVED")).toBe(true);
    expect(isValidLabCustodyTransition("RECEIVED", "TESTING")).toBe(true);
    expect(isValidLabCustodyTransition("TESTING", "COMPLETED")).toBe(true);
    expect(isValidLabCustodyTransition("COMPLETED", "RELEASED")).toBe(true);
  });

  it("rejects skipped, reversed, and terminal transitions", () => {
    expect(isValidLabCustodyTransition("EXPECTED", "TESTING")).toBe(false);
    expect(isValidLabCustodyTransition("TESTING", "RECEIVED")).toBe(false);
    expect(isValidLabCustodyTransition("RELEASED", "EXPECTED")).toBe(false);
  });
});
