import crypto from "crypto";
import { Request } from "express";
import { AuthSessionModel } from "../database/models/authSession";

const firstHeader = (value: string | string[] | undefined) =>
  String(Array.isArray(value) ? value[0] : value || "").split(",")[0].trim();

export const requestMetadata = (req: Request) => {
  const country = firstHeader(req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"]);
  const city = firstHeader(req.headers["x-vercel-ip-city"]);
  const region = firstHeader(req.headers["x-vercel-ip-country-region"]);
  return {
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
    ipAddress: firstHeader(req.headers["x-forwarded-for"]) || String(req.socket.remoteAddress || ""),
    location: ([city, region, country].filter(Boolean).join(", ") || "Unknown").slice(0, 160),
  };
};

export const createAuthSession = async (req: Request, user: any, role: string, expiresAt: Date) => {
  const sessionId = crypto.randomBytes(32).toString("base64url");
  await AuthSessionModel.create({ sessionId, userId: user._id, role, ...requestMetadata(req), expiresAt });
  return sessionId;
};
