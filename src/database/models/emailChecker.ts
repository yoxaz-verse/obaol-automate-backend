// Import other user-related models if necessary

import { InventoryManagerModel } from "./inventoryManager";
import { AdminModel } from "./admin";
import { CustomerModel } from "./customer";
import { ProjectManagerModel } from "./projectManager";

export const isEmailTaken = async (email: string): Promise<boolean> => {
  // Check in all relevant user collections
  const projectManagerExists = await ProjectManagerModel.findOne({ email });
  const inventoryManagerExists = await InventoryManagerModel.findOne({ email });
  const customerExists = await CustomerModel.findOne({ email });
  const adminExists = await AdminModel.findOne({ email });
  const associateExists = await AssociateModel.findOne({ email });
  // Add checks for other user types if needed

  return !!(
    inventoryManagerExists ||
    projectManagerExists ||
    customerExists ||
    adminExists ||
    associateExists
  );
};
import { Request, Response, NextFunction } from "express";
import { AssociateModel } from "./associate";

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
