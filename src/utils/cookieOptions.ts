import { CookieOptions } from "express";

const isLocalHost = (host: string) => {
  const normalized = String(host || "").toLowerCase();
  return normalized.includes("localhost") || normalized.startsWith("127.0.0.1");
};

export const getAuthCookieOptions = (host: string): CookieOptions => {
  const production = process.env.NODE_ENV === "production";
  const local = isLocalHost(host);

  return {
    httpOnly: true,
    secure: production,
    sameSite: production && !local ? "none" : "lax",
    path: "/",
    domain: production && !local ? ".obaol.com" : undefined,
    maxAge: 24 * 60 * 60 * 1000,
  };
};

