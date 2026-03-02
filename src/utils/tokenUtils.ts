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
}

/**
 * Generates a JWT token for a user.
 * @param user - The user object (Admin or Customer).
 * @returns The signed JWT token.
 */
export const generateJWTToken = (
  user: IAdmin | IWorker
): string => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    associateCompany: (user as any).associateCompany ? String((user as any).associateCompany) : null,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "1h", // Token validity duration
  });

  return token;
};
