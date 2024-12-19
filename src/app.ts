// src/app.ts

import express from "express";
import helmet from "helmet";
import { errorHandler } from "./utils/errorHandler";
import { responseFormatter } from "./utils/responseFormatter";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes";
import path from "path"; // Import path to handle file paths
import apiLogger from "./middlewares/apiLogger";

const app = express();

// Use Helmet for security headers (optional, can be uncommented if needed)
// app.use(
//   helmet({
//     contentSecurityPolicy: false, // Disable CSP for APIs
//     frameguard: false, // No need for frameguard in APIs
//     hidePoweredBy: true, // Hide the X-Powered-By header
//     hsts: false, // Disable HSTS for APIs
//     xssFilter: true, // Enable XSS filter
//     noSniff: true, // Prevent MIME-sniffing
//     referrerPolicy: { policy: "same-origin" }, // Set Referrer-Policy header
//   })
// );

// Middleware for parsing JSON and formatting responses
app.use(express.json());
// If you need to parse URL-encoded data, uncomment the following line
// app.use(express.urlencoded({ extended: true }));

// Apply responseFormatter middleware before other middleware and routes
app.use(responseFormatter);

// CORS middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"], // Specify allowed origins
    credentials: true,
  })
);
// app.use(apiLogger);
// Logging middleware
app.use(morgan("common"));

// Cookie parsing middleware
app.use(cookieParser());

// Serve static files from uploads before defining routes
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    // Optional: Set cache options or other static file options here
    extensions: ["jpg", "jpeg", "png", "gif"], // Specify allowed file extensions
    index: false, // Disable directory indexing
  })
);

// API routes
app.use("/api", routes);

// 404 Handler (should be after all other routes and middleware)
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    message: "Resource not found",
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

export default app;
