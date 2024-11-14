// src/middlewares/activityManager.ts

import { Request, Response, NextFunction } from "express";

export const validateActivityManager = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add your validation logic here
  // Example: Check if required fields are provided
  const { email, name, password, admin } = req.body;
  if (!email || !name || !password || !admin) {
    return res.status(400).json({ error: "All fields are required." });
  }
  next();
};
