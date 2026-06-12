import app from "./app";
import { BASE_URL, NODE_ENV, PORT } from "./config";
import envVars from "./config/validateEnv";
import connectDB from "./database/connection";
import path from "path";
import express from "express";
import "./cron"; // ✅ Add this line to start cron jobs!
import { prefix } from "./routes";
import { seedCompanyFunctions } from "./seeds/companyFunctions.seed";
import { seedIncoterms } from "./seeds/incoterms.seed";
import { seedPaymentTerms } from "./seeds/paymentTerms.seed";
import { verifySmtpTransport } from "./utils/mailer";
const PORTD = Number(PORT) || 5001;
const shouldRunStartupSeeds = process.env.RUN_STARTUP_SEEDS === "true";
const shouldLogStartupDiagnostics = NODE_ENV !== "production" || process.env.STARTUP_DEBUG_LOGS === "true";

const logSmtpConfigPresence = () => {
  if (!shouldLogStartupDiagnostics) return;
  const fields = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_AUTH_PASSWORD",
    "SMTP_AUTH_USER",
    "SMTP_NOTIFY_USER",
    "SMTP_SUPPORT_USER",
  ] as const;
  const summary = fields.reduce<Record<string, "present" | "missing">>((acc, field) => {
    const raw = String(process.env[field] || "").trim();
    acc[field] = raw ? "present" : "missing";
    return acc;
  }, {});
  console.log("SMTP env presence:", summary);
};

async function startServer() {
  try {
    // Fail-fast: validate required environment before accepting traffic.
    void envVars;
    logSmtpConfigPresence();
    if (process.env.SMTP_VERIFY_ON_STARTUP === "true") {
      await verifySmtpTransport("auth");
    }
    await connectDB();
    if (shouldRunStartupSeeds) {
      await seedCompanyFunctions();
      await seedIncoterms();
      await seedPaymentTerms();
    }
    app.listen(PORTD, "::", () => {
      console.log(`OBAOL Server is running on port ${PORTD}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`${BASE_URL}/api${prefix}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

app.use("/uploads", express.static(path.join(__dirname, "./uploads")));
startServer();
