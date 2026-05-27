import express from "express";
import helmet from "helmet";
import { errorHandler } from "./utils/errorHandler";
import { responseFormatter } from "./utils/responseFormatter";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { localizationMiddleware } from "./middlewares/localizationMiddleware";
import routes from "./routes";
import path from "path";
import apiLogger from "./middlewares/apiLogger";
import { registerAllHooks } from "./core/hooks"; // Ensure this path is correct

const app = express();

// Register Hooks
registerAllHooks();

// Optional Helmet settings
// app.use(helmet({ ... }));

// Parse JSON
app.use(express.json());

// If you need to parse form data, uncomment:
// app.use(express.urlencoded({ extended: true }));

// Apply response formatter (if you need it before anything else)
app.use(responseFormatter);

// CORS middleware
const allowOrigin = (origin?: string) => {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)*obaol\.com$/i.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (allowOrigin(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // <--- Needed for cross-site cookie usage
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

// Logger
app.use(apiLogger);
const shouldUseMorgan = process.env.NODE_ENV !== "production" || process.env.ENABLE_HTTP_ACCESS_LOGS === "true";
if (shouldUseMorgan) {
  app.use(morgan("common"));
}

// Cookie parsing
app.use(cookieParser());

// Localization
app.use(localizationMiddleware);

// Serve static uploads if needed
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    extensions: ["jpg", "jpeg", "png", "gif"],
    index: false,
  })
);

// Main API routes
app.use("/api", routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    message: "Resource not found",
  });
});

// Error handler
app.use(errorHandler);

export default app;
