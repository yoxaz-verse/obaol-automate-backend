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
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://automate.obaol.com",
      "https://www.automate.obaol.com",
      "https://obaol.com",
      "https://www.obaol.com",
      // Add any other allowed origins
    ],
    credentials: true, // <--- Needed for cross-site cookie usage
  })
);

// Logger
app.use(apiLogger);
app.use(morgan("common"));

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
