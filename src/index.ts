import app from "./app";
import { BASE_URL, NODE_ENV, PORT } from "./config";
import connectDB from "./database/connection";
import path from "path";
import express from "express";
import "./cron"; // ✅ Add this line to start cron jobs!
import { prefix } from "./routes";
const port = PORT || 5001;
async function startServer() {
  await connectDB();
  app.listen(port, () => {
    console.log(`OBAOL Server is running on port ${port}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`${BASE_URL}/api${prefix}`);
  });
}
app.use("/uploads", express.static(path.join(__dirname, "./uploads")));
startServer();
