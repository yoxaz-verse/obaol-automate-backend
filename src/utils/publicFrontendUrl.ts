const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export const resolvePublicFrontendUrl = () => {
  const environment = String(process.env.NODE_ENV || "development").toLowerCase();
  const configured = String(process.env.FRONTEND_URL || "").trim();
  const raw = configured || (environment === "production" ? "" : "http://localhost:3000");
  if (!raw) throw new Error("FRONTEND_URL is required in production.");

  const parsed = new URL(raw);
  const loopback = LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase());
  if (environment === "production" && (loopback || parsed.protocol !== "https:")) {
    throw new Error("FRONTEND_URL must be a public HTTPS origin in production.");
  }
  return parsed.origin.replace(/\/+$/, "");
};

