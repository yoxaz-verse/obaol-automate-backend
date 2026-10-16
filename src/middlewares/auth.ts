// src/middlewares/authMiddleware.ts

import { JWT_SECRET } from "../config";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";
import { AdminModel } from "../database/models/admin";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import { CustomerSupportAgentModel } from "../database/models/customerSupportAgent";
import { AuthSessionModel } from "../database/models/authSession";
import { requireApprovedAssociateCompany } from "../utils/companyApprovalAccess";

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  associateCompany?: string | null;
  sessionId?: string;
  authStage?: "email_verification";
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

const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
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
    if (decoded.authStage) {
      return res.status(401).json({
        success: false,
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Please verify your email OTP before continuing.",
      });
    }
    if (decoded.sessionId) {
      const session = await AuthSessionModel.findOne({ sessionId: decoded.sessionId, userId: decoded.id, role: decoded.role });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        return res.status(401).json({ success: false, message: "Authentication failed: Session expired or revoked" });
      }
      const activeCutoff = new Date(Date.now() - 60 * 1000);
      if (!session.lastActiveAt || session.lastActiveAt < activeCutoff) {
        AuthSessionModel.updateOne({ _id: session._id }, { $set: { lastActiveAt: new Date() } }).catch(() => undefined);
      }
    }
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
    } else if (roleLower === "admin") {
      AdminModel.updateOne(
        { _id: decoded.id, $or: [{ lastSeenAt: { $lt: throttleCutoff } }, { lastSeenAt: null }, { lastSeenAt: { $exists: false } }] },
        updateDoc
      ).catch((error: any) => console.debug("Presence update skipped (admin):", error?.message || error));
    } else if (roleLower === "inventorymanager" || roleLower === "inventory-manager") {
      InventoryManagerModel.updateOne(
        { _id: decoded.id, $or: [{ lastSeenAt: { $lt: throttleCutoff } }, { lastSeenAt: null }, { lastSeenAt: { $exists: false } }] },
        updateDoc
      ).catch((error: any) => console.debug("Presence update skipped (inventory manager):", error?.message || error));
    } else if (roleLower === "customersupport" || roleLower === "customer-support") {
      CustomerSupportAgentModel.updateOne(
        { _id: decoded.id, $or: [{ lastSeenAt: { $lt: throttleCutoff } }, { lastSeenAt: null }, { lastSeenAt: { $exists: false } }] },
        updateDoc
      ).catch((error: any) => console.debug("Presence update skipped (customer support):", error?.message || error));
    }

    return requireApprovedAssociateCompany(req, res, next);
  } catch (error: any) {
    console.log("Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Authentication failed: Invalid token",
    });
  }
};

export const authenticateEmailVerificationToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.auth_token || req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Email verification session is required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as DecodedToken;
    if (!decoded.authStage) {
      return authenticateToken(req, res, next);
    }
    if (decoded.authStage !== "email_verification") {
      return res.status(401).json({ success: false, message: "Invalid email verification session." });
    }

    const role = String(decoded.role || "");
    const model: any = role === "Associate" ? AssociateModel : role === "Operator" ? OperatorModel : null;
    if (!model) {
      return res.status(401).json({ success: false, message: "Invalid email verification session." });
    }

    const user = await model.findById(decoded.id)
      .select("email authProvider isEmailVerified onboardingComplete isDeleted")
      .lean();
    const tokenEmail = String(decoded.email || "").trim().toLowerCase();
    const accountEmail = String(user?.email || "").trim().toLowerCase();
    const validDraft = Boolean(user)
      && tokenEmail === accountEmail
      && String(user?.authProvider || "LOCAL").toUpperCase() === "LOCAL"
      && user?.isEmailVerified !== true
      && user?.onboardingComplete !== true
      && user?.isDeleted !== true;
    if (!validDraft) {
      return res.status(401).json({ success: false, message: "Invalid or expired email verification session." });
    }

    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired email verification session." });
  }
};

export default authenticateToken;
