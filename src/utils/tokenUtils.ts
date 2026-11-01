// src/utils/tokenUtils.ts

import { IAdmin } from "interfaces/admin";
import { IWorker } from "interfaces/worker";
import jwt from "jsonwebtoken";

// Define the payload interface
interface TokenPayload {
  id: string;
  email: string;
  role: string;
  associateCompany?: string | null;
  sessionId?: string;
  persistent?: boolean;
  authStage?: "email_verification";
}

/**
 * Generates a JWT token for a user.
 * @param user - The user object (Admin or Customer).
 * @returns The signed JWT token.
 */
export const generateJWTToken = (
  user: IAdmin | IWorker,
  expiresIn: string = "1h",
  sessionId?: string,
  persistent = false,
): string => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    associateCompany: (user as any).associateCompany ? String((user as any).associateCompany) : null,
    ...(sessionId ? { sessionId } : {}),
    ...(persistent ? { persistent: true } : {}),
  };

  const token = jwt.sign(payload, (process.env.JWT_SECRET as string) || "secret", {
    expiresIn: expiresIn as any, // Use the provided duration or default to 1h
  });

  return token;
};

export const generateEmailVerificationToken = (user: IAdmin | IWorker, expiresIn = "15m"): string => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    email: String(user.email || "").trim().toLowerCase(),
    role: user.role,
    authStage: "email_verification",
  };

  return jwt.sign(payload, (process.env.JWT_SECRET as string) || "secret", {
    expiresIn: expiresIn as any,
  });
};
