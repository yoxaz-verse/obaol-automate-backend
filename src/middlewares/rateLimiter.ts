// src/middlewares/rateLimiter.ts

import rateLimit from "express-rate-limit";

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 upload requests per windowMs
  message:
    "Too many upload requests from this IP, please try again after 15 minutes.",
  headers: true,
});

export default uploadLimiter;
