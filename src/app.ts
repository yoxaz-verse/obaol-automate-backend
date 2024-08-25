import express from "express";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler } from "./utils/errorHandler";
import { responseFormatter } from "./utils/responseFormatter";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

const app = express();

// Use Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for APIs
    frameguard: false, // No need for frameguard in APIs
    hidePoweredBy: true, // Hide the X-Powered-By header
    hsts: false, // Disable HSTS for APIs
    xssFilter: true, // Enable XSS filter
    noSniff: true, // Prevent MIME-sniffing
    referrerPolicy: { policy: "same-origin" }, // Set Referrer-Policy header
  })
);

// Middleware for parsing JSON and formatting responses
app.use(express.json());
app.use(responseFormatter);

// CORS middleware
app.use(
  cors({
    origin: "*", // Adjust origin as needed for your application
    credentials: true,
  })
);

// Logging middleware
app.use(morgan("common"));

// Cookie parsing middleware
app.use(cookieParser());

// API routes
app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    status: 404,
    message: "Resource not found",
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;

