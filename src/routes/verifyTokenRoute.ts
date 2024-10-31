// src/routes/verifyTokenRoute.ts

import authenticateToken from "../middlewares/auth";
import { Router } from "express";

const verifyTokenRoute = Router();

verifyTokenRoute.get("/", authenticateToken, (req: any, res) => {
  if (!req.user) {
    // Additional check to ensure req.user is defined
    return res.status(401).json({
      success: false,
      message: "Authentication failed: No user data",
    });
  }

  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default verifyTokenRoute;
