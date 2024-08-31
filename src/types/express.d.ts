import { IAdmin } from "../database/models/admin"; // Adjust the path as necessary
import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: IAdmin; // Adjust this type based on your actual user object structure
  }
}
