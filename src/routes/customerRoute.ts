import { Router } from "express";
import CustomerService from "../services/customer";
import CustomerMiddleware from "../middlewares/customer";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";

const customerRoute = Router();
const customerService = new CustomerService();
const customerMiddleware = new CustomerMiddleware();

customerRoute.get(
  "/",
  authenticateToken,
  customerService.getCustomers.bind(customerService)
);
customerRoute.get(
  "/:id",
  authenticateToken,
  customerMiddleware.getCustomer.bind(customerMiddleware),
  customerService.getCustomer.bind(customerService)
);
customerRoute.post(
  "/",
  validateUniqueEmail,
  authenticateToken,
  customerMiddleware.createCustomer.bind(customerMiddleware),
  customerService.createCustomer.bind(customerService)
);
customerRoute.patch(
  "/:id",
  authenticateToken,
  customerMiddleware.updateCustomer.bind(customerMiddleware),
  customerService.updateCustomer.bind(customerService)
);
customerRoute.delete(
  "/:id",
  authenticateToken,
  customerMiddleware.deleteCustomer.bind(customerMiddleware),
  customerService.deleteCustomer.bind(customerService)
);

export default customerRoute;
