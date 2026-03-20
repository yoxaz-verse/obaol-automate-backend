import app from "./app";
import { BASE_URL, NODE_ENV, PORT } from "./config";
import connectDB from "./database/connection";
import path from "path";
import express from "express";
import "./cron"; // ✅ Add this line to start cron jobs!
import { prefix } from "./routes";
import { seedCompanyFunctions } from "./seeds/companyFunctions.seed";
import { seedIncoterms } from "./seeds/incoterms.seed";
import { seedPaymentTerms } from "./seeds/paymentTerms.seed";
const PORTD = Number(PORT) || 5001;

async function startServer() {
  try {
    await connectDB();
    await seedCompanyFunctions();
    await seedIncoterms();
    await seedPaymentTerms();
    app.listen(PORTD, '0.0.0.0', () => {
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
