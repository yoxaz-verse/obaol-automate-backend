export const ASSOCIATE_PASSWORD_ERROR =
  "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.";

export const REPEATED_PHONE_ERROR = "Enter a valid phone number; repeated digits are not allowed.";

export const isStrongAssociatePassword = (password: unknown): boolean => {
  const value = String(password || "");
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value)
  );
};

export const isRepeatedDigitPhone = (nationalNumber: unknown): boolean => {
  const digits = String(nationalNumber || "").replace(/\D/g, "");
  return digits.length > 0 && /^(\d)\1+$/.test(digits);
};
