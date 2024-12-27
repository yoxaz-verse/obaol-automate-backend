// Import other user-related models if necessary

import { ActivityManagerModel } from "./activityManager";
import { AdminModel } from "./admin";
import { CustomerModel } from "./customer";
import { ProjectManagerModel } from "./projectManager";
import { WorkerModel } from "./worker";

export const isEmailTaken = async (email: string): Promise<boolean> => {
  // Check in all relevant user collections
  const projectManagerExists = await ProjectManagerModel.findOne({ email });
  const activityManagerExists = await ActivityManagerModel.findOne({ email });
  const customerExists = await CustomerModel.findOne({ email });
  const workerExists = await WorkerModel.findOne({ email });
  const adminExists = await AdminModel.findOne({ email });
  // Add checks for other user types if needed

  return !!(
    activityManagerExists ||
    projectManagerExists ||
    customerExists ||
    workerExists ||
    adminExists
  );
};
import { Request, Response, NextFunction } from "express";

export const validateUniqueEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const emailInUse = await isEmailTaken(email);

  if (emailInUse) {
    return res.status(409).json({ message: "Email is already in use." });
  }

  next();
};
