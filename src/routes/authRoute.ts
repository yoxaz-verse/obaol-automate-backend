// src/routes/authRoute.ts

import { Router } from "express";
import { authenticateUser, requestPasswordReset, completePasswordReset, logoutUser, registerAssociate } from "../services/authService";

const authRoute = Router();

authRoute.post("/", authenticateUser);
authRoute.post("/register", registerAssociate);
authRoute.post("/logout", logoutUser);
authRoute.post("/forgot-password", requestPasswordReset);
authRoute.post("/reset-password", completePasswordReset);

export default authRoute;
