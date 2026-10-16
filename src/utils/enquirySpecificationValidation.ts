export const CONTACT_NUMBER_SPECIFICATION_ERROR =
  "Contact numbers are not allowed in specifications.";

// Seven or more digits separated only by characters commonly used to format
// phone numbers. Short measurements and grades remain valid.
const PHONE_LIKE_NUMBER_PATTERN = /(?:\+?\s*)?(?:\(?\d\)?[\s().-]*){7,}/;

export const containsPhoneLikeNumber = (value: unknown): boolean =>
  PHONE_LIKE_NUMBER_PATTERN.test(String(value ?? "").normalize("NFKC"));
