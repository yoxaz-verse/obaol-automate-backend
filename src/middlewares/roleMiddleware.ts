// src/middlewares/roleMiddleware.ts

import { Request, Response, NextFunction } from "express";

const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Authorization failed: No user information",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Authorization failed: Insufficient permissions",
      });
    }

    next();
  };
};

export default authorizeRoles;
