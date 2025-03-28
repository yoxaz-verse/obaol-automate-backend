// src/middlewares/authMiddleware.ts

import { JWT_SECRET } from "../config";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface DecodedToken {
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

const authenticateChecking = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token;

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as DecodedToken;
    req.user = decoded;
    next();
  } catch (error: any) {
    next();
  }
};

export default authenticateChecking;
