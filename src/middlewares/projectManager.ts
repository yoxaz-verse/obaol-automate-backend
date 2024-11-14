// src/middlewares/projectManager.ts

import { Request, Response, NextFunction } from "express";

export const validateProjectManager = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add your validation logic here
  const { email, name, password, admin } = req.body;
  if (!email || !name || !password || !admin) {
    return res.status(400).json({ error: "All fields are required." });
  }
  next();
};
