import { describe, expect, it } from "vitest";
import {
  CONTACT_NUMBER_SPECIFICATION_ERROR,
  containsPhoneLikeNumber,
} from "./enquirySpecificationValidation";

describe("enquiry specification contact-number validation", () => {
  it.each([
    "",
    "Organic export quality",
    "6-7mm",
    "Grade 1",
    "10% moisture",
    "2 x 25 kg bags",
  ])("allows %j", (value) => {
    expect(containsPhoneLikeNumber(value)).toBe(false);
  });

  it.each([
    "Call me at 917028255569",
    "My number is +91 70282 55569",
    "Reach me on 702-825-5569",
    "Phone: 702.825.5569",
    "Phone: (702) 825 5569",
    "Full-width: ＋９１ ７０２８２５５５６９",
  ])("rejects %j", (value) => {
    expect(containsPhoneLikeNumber(value)).toBe(true);
  });

  it("uses the public validation error message", () => {
    expect(CONTACT_NUMBER_SPECIFICATION_ERROR).toBe(
      "Contact numbers are not allowed in specifications.",
    );
  });
});
