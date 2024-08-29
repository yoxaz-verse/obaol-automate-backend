import { Router } from "express";
import CustomerService from "../services/customer";
import CustomerMiddleware from "../middlewares/customer";

const customerRoute = Router();
const customerService = new CustomerService();
const customerMiddleware = new CustomerMiddleware();

customerRoute.get(
  "/",
  customerMiddleware.getAllCustomer.bind(customerMiddleware),
  customerService.getCustomers.bind(customerService)
);
customerRoute.get(
  "/:id",
  customerMiddleware.getCustomer.bind(customerMiddleware),
  customerService.getCustomer.bind(customerService)
);
customerRoute.post(
  "/",
  customerMiddleware.createCustomer.bind(customerMiddleware),
  customerService.createCustomer.bind(customerService)
);
customerRoute.put(
  "/:id",
  customerMiddleware.updateCustomer.bind(customerMiddleware),
  customerService.updateCustomer.bind(customerService)
);
customerRoute.delete(
  "/:id",
  customerMiddleware.deleteCustomer.bind(customerMiddleware),
  customerService.deleteCustomer.bind(customerService)
);

export default customerRoute;
