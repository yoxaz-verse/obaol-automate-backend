// src/routes/authRoute.ts

import { Router } from "express";
import { authenticateUser } from "../services/authService";

const authRoute = Router();

authRoute.post("/", authenticateUser);

export default authRoute;
