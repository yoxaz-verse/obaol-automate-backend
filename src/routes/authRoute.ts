// src/routes/authRoute.ts

import { Router } from "express";
import {
  authenticateUser,
  requestPasswordReset,
  completePasswordReset,
  logoutUser,
  registerAssociate,
  registerOperator,
  getRegisterOptions,
  getOperatorRegisterOptions,
  getRegisterCompanies,
  getRegisterDesignations,
  getRegisterCountries,
  getRegisterPincodes,
  getCompanyInterestsStatus,
  upsertCompanyInterests,
  updateAssociateTradeMode,
  authenticateGoogle,
  getEmailStatus,
  startOnboarding,
  completeOnboarding,
} from "../services/authService";
import authenticateToken from "../middlewares/auth";
import {
  authLoginLimiter,
  authOnboardingLimiter,
  authRegisterLimiter,
  passwordResetLimiter,
} from "../middlewares/rateLimiter";

const authRoute = Router();

authRoute.post("/", authLoginLimiter, authenticateUser);
authRoute.post("/register", authRegisterLimiter, registerAssociate);
authRoute.post("/google", authRegisterLimiter, authenticateGoogle);
authRoute.get("/email-status", getEmailStatus);
authRoute.get("/register/options", getRegisterOptions);
authRoute.get("/register/companies", getRegisterCompanies);
authRoute.get("/register/designations", getRegisterDesignations);
authRoute.get("/register/countries", getRegisterCountries);
authRoute.get("/register/pincodes", getRegisterPincodes);
authRoute.post("/operator/register", authRegisterLimiter, registerOperator);
authRoute.get("/operator/register/options", getOperatorRegisterOptions);
authRoute.post("/onboarding/start", authOnboardingLimiter, startOnboarding);
authRoute.post("/onboarding", authOnboardingLimiter, authenticateToken, completeOnboarding);
authRoute.get("/company-interests/status", authenticateToken, getCompanyInterestsStatus);
authRoute.put("/company-interests", authenticateToken, upsertCompanyInterests);
authRoute.put("/trade-mode", authenticateToken, updateAssociateTradeMode);
authRoute.post("/logout", logoutUser);
authRoute.post("/forgot-password", passwordResetLimiter, requestPasswordReset);
authRoute.post("/reset-password", passwordResetLimiter, completePasswordReset);

export default authRoute;
