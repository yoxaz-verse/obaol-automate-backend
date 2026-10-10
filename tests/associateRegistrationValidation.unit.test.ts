import { describe, expect, it } from "vitest";
import {
  ASSOCIATE_PASSWORD_ERROR,
  REPEATED_PHONE_ERROR,
  isRepeatedDigitPhone,
  isStrongAssociatePassword,
} from "../src/utils/associateRegistrationValidation";

describe("associate registration validation", () => {
  it("enforces every password requirement", () => {
    expect(isStrongAssociatePassword("Strong!1")).toBe(true);
    expect(isStrongAssociatePassword("Short!1")).toBe(false);
    expect(isStrongAssociatePassword("password1!")).toBe(false);
    expect(isStrongAssociatePassword("PASSWORD1!")).toBe(false);
    expect(isStrongAssociatePassword("Password!!")).toBe(false);
    expect(isStrongAssociatePassword("Password11")).toBe(false);
    expect(isStrongAssociatePassword("Password1 ")).toBe(false);
    expect(ASSOCIATE_PASSWORD_ERROR).toContain("special character");
  });

  it("rejects repeated phone digits without rejecting mixed numbers or blanks", () => {
    expect(isRepeatedDigitPhone("0000000000")).toBe(true);
    expect(isRepeatedDigitPhone("1111111")).toBe(true);
    expect(isRepeatedDigitPhone("7028255569")).toBe(false);
    expect(isRepeatedDigitPhone("")).toBe(false);
    expect(REPEATED_PHONE_ERROR).toContain("repeated digits");
  });
});
