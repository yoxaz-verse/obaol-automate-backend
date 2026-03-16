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
} from "../services/authService";
import authenticateToken from "../middlewares/auth";

const authRoute = Router();

authRoute.post("/", authenticateUser);
authRoute.post("/register", registerAssociate);
authRoute.get("/register/options", getRegisterOptions);
authRoute.get("/register/companies", getRegisterCompanies);
authRoute.get("/register/designations", getRegisterDesignations);
authRoute.get("/register/countries", getRegisterCountries);
authRoute.get("/register/pincodes", getRegisterPincodes);
authRoute.post("/operator/register", registerOperator);
authRoute.get("/operator/register/options", getOperatorRegisterOptions);
authRoute.get("/company-interests/status", authenticateToken, getCompanyInterestsStatus);
authRoute.put("/company-interests", authenticateToken, upsertCompanyInterests);
authRoute.post("/logout", logoutUser);
authRoute.post("/forgot-password", requestPasswordReset);
authRoute.post("/reset-password", completePasswordReset);

export default authRoute;
