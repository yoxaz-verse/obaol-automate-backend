// src/middlewares/authMiddleware.ts

import { JWT_SECRET } from "../config";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface DecodedToken {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({
      success: false,
      message: "Authentication failed: No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as DecodedToken;
    req.user = decoded;
    console.log("Decoded token:", decoded);
    next();
  } catch (error: any) {
    console.log("Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Authentication failed: Invalid token",
    });
  }
};

export default authenticateToken;
