// src/middlewares/authMiddleware.ts

import { JWT_SECRET } from "../config";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  associateCompany?: string | null;
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
  // Prioritize HttpOnly cookie 'auth_token', fallback to 'token' or Authorization header
  const token = req.cookies.auth_token || req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    const ua = String(req.headers["user-agent"] || "");
    const braveLike = /\bbrave\b/i.test(ua) || /\bchrom(e|ium)\b/i.test(ua);
    console.log("No token provided", {
      origin: String(req.headers.origin || ""),
      host: String(req.headers["x-forwarded-host"] || req.headers.host || ""),
      browserHint: braveLike ? "chromium-family" : "other",
    });
    return res.status(401).json({
      success: false,
      message: "Authentication failed: No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as DecodedToken;
    req.user = decoded;

    // Non-blocking presence update (throttled to 60s)
    const roleLower = String(decoded.role || "").toLowerCase();
    const now = new Date();
    const throttleCutoff = new Date(now.getTime() - 60 * 1000);
    const updateDoc = {
      $set: {
        lastSeenAt: now,
        presenceUpdatedAt: now,
        presenceSource: "AUTH_REQUEST",
      },
    };

    if (roleLower === "associate") {
      AssociateModel.updateOne(
        { _id: decoded.id, $or: [{ lastSeenAt: { $lt: throttleCutoff } }, { lastSeenAt: null }, { lastSeenAt: { $exists: false } }] },
        updateDoc
      ).catch((error: any) => {
        // eslint-disable-next-line no-console
        console.debug("Presence update skipped (associate):", error?.message || error);
      });
    } else if (roleLower === "operator" || roleLower === "team") {
      OperatorModel.updateOne(
        { _id: decoded.id, $or: [{ lastSeenAt: { $lt: throttleCutoff } }, { lastSeenAt: null }, { lastSeenAt: { $exists: false } }] },
        updateDoc
      ).catch((error: any) => {
        // eslint-disable-next-line no-console
        console.debug("Presence update skipped (operator):", error?.message || error);
      });
    }

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
