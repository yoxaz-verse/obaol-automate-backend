import app from "./app";
import { BASE_URL, NODE_ENV, PORT } from "./config";
import envVars from "./config/validateEnv";
import connectDB from "./database/connection";
import path from "path";
import express from "express";
import mongoose from "mongoose";
import { startCronJobs, stopCronJobs } from "./cron";
import type { Server } from "http";
import { prefix } from "./routes";
import { seedCompanyFunctions } from "./seeds/companyFunctions.seed";
import { seedIncoterms } from "./seeds/incoterms.seed";
import { seedPaymentTerms } from "./seeds/paymentTerms.seed";
import { verifySmtpTransport } from "./utils/mailer";
const PORTD = Number(PORT) || 5001;
const shouldRunStartupSeeds = process.env.RUN_STARTUP_SEEDS === "true";
const shouldLogStartupDiagnostics = NODE_ENV !== "production" || process.env.STARTUP_DEBUG_LOGS === "true";
let server: Server | undefined;
let shuttingDown = false;

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
    // Canonical company functions are application schema, not optional demo data.
    await seedCompanyFunctions();
    if (shouldRunStartupSeeds) {
      await seedIncoterms();
      await seedPaymentTerms();
    }
    startCronJobs();
    server = app.listen(PORTD, "::", () => {
      console.log(`OBAOL Server is running on port ${PORTD}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`${BASE_URL}/api${prefix}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully.`);
  stopCronJobs();

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out; forcing exit.");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await mongoose.disconnect();
  clearTimeout(forceExitTimer);
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    shutdown(signal)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Graceful shutdown failed:", error);
        process.exit(1);
      });
  });
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
