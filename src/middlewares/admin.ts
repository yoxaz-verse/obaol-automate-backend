import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";
import { verifyToken } from "../helpers/encrypt";

// CustomRequest is an interface that extends the Express Request to include admin information
interface CustomRequest extends Request {
  admin?: {
    id: string;
    email: string;
  };
}

class AdminMiddleware {
  constructor() {}

  // Middleware to validate if the user is an admin
  public async validateAdmin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1];

      if (!accessToken) {
        return res
          .status(401)
          .send({ message: "Access token is missing or invalid" });
      }

      const decoded = verifyToken(accessToken) as {
        id: string;
        email: string;
        role: string;
      };

      if (!decoded) {
        return res.status(401).send({ message: "Access token is expired" });
      }

      if (decoded.role !== "admin") {
        return res
          .status(403)
          .send({ message: "Access forbidden: admins only" });
      }

      req.admin = decoded;
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateAdmin");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware to validate if the user is a super admin
  public async validateSuperAdmin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1];

      if (!accessToken) {
        return res
          .status(401)
          .send({ message: "Access token is missing or invalid" });
      }

      const decoded = verifyToken(accessToken) as {
        id: string;
        email: string;
        role: string;
      };

      if (!decoded) {
        return res.status(401).send({ message: "Access token is expired" });
      }

      if (decoded.role !== "superAdmin") {
        return res
          .status(403)
          .send({ message: "Access forbidden: superadmins only" });
      }

      req.admin = decoded;
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateSuperAdmin");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware to validate if the user is either an admin or super admin
  public async validateAdminOrSuperAdmin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1];

      if (!accessToken) {
        return res
          .status(401)
          .send({ message: "Access token is missing or invalid" });
      }

      const decoded = verifyToken(accessToken) as {
        id: string;
        email: string;
        role: string;
      };

      if (!decoded) {
        return res.status(401).send({ message: "Access token is expired" });
      }

      if (decoded.role !== "admin" && decoded.role !== "superAdmin") {
        return res
          .status(403)
          .send({ message: "Access forbidden: admins or superadmins only" });
      }

      req.admin = decoded;
      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-validateAdminOrSuperAdmin");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware for admin login validation
  public async adminLogin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .send({ message: "Email and password are required" });
      }

      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-adminLogin");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware for admin logout validation
  public async adminLogout(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1];

      if (!accessToken) {
        return res
          .status(401)
          .send({ message: "Access token is missing or invalid" });
      }

      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-adminLogout");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware for refreshing the token
  public async refreshToken(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const refreshToken = req.headers.authorization?.split(" ")[1];

      if (!refreshToken) {
        return res
          .status(401)
          .send({ message: "Refresh token is missing or invalid" });
      }

      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-refreshToken");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware for creating a new admin
  public async createAdmin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .send({ message: "Email and password are required" });
      }

      const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
      if (!password.match(passwordRegex)) {
        return res.status(400).send({
          message:
            "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        });
      }

      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-createAdmin");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware for updating an admin
  public async updateAdmin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).send({ message: "ID must be provided" });
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).send({ message: "Request body is empty" });
      }

      if (req.body.isSuperAdmin) {
        return res
          .status(400)
          .send({ message: "isSuperAdmin cannot be updated" });
      }

      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-updateAdmin");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware for deleting an admin
  public async deleteAdmin(
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).send({ message: "ID must be provided" });
      }

      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-deleteAdmin");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }

  // Middleware for getting an admin by ID
  public async getAdmin(req: CustomRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).send({ message: "ID must be provided" });
      }

      next();
    } catch (error) {
      await logError(error, req, "AdminMiddleware-getAdmin");
      res.status(500).send({
        message: "An unexpected error occurred",
        error: error,
      });
    }
  }
}

export default AdminMiddleware;
