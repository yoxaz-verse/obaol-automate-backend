// src/middlewares/rateLimiter.ts

import rateLimit from "express-rate-limit";

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const standardHeaders = true;
const legacyHeaders = false;

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 upload requests per windowMs
  message:
    "Too many upload requests from this IP, please try again after 15 minutes.",
  headers: true,
});

export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: toPositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 30),
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: "Too many sign-in attempts. Please wait and try again." },
});

export const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: toPositiveInt(process.env.AUTH_REGISTER_RATE_LIMIT_MAX, 20),
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: "Too many registration attempts. Please wait and try again." },
});

export const authOnboardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: toPositiveInt(process.env.AUTH_ONBOARDING_RATE_LIMIT_MAX, 30),
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: "Too many onboarding attempts. Please wait and try again." },
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: toPositiveInt(process.env.AUTH_OTP_RATE_LIMIT_MAX, 8),
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: "Too many OTP attempts. Please wait and try again." },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: toPositiveInt(process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX, 5),
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: "Too many password reset attempts. Please wait and try again." },
});

export const passkeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: toPositiveInt(process.env.AUTH_PASSKEY_RATE_LIMIT_MAX, 20),
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: "Too many passkey attempts. Please wait and try again." },
});

export default uploadLimiter;
