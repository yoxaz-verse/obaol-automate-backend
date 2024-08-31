import { Router } from "express";
import CustomerService from "../services/customer";
import CustomerMiddleware from "../middlewares/customer";

const router = Router();
const customerService = new CustomerService();
const customerMiddleware = new CustomerMiddleware();

router.get(
  "/",
  customerService.getCustomers.bind(customerService)
);
router.get(
  "/:id",
  customerMiddleware.getCustomer.bind(customerMiddleware),
  customerService.getCustomer.bind(customerService)
);
router.post(
  "/",
  customerMiddleware.createCustomer.bind(customerMiddleware),
  customerService.createCustomer.bind(customerService)
);
router.patch(
  "/:id",
  customerMiddleware.updateCustomer.bind(customerMiddleware),
  customerService.updateCustomer.bind(customerService)
);
router.delete(
  "/:id",
  customerMiddleware.deleteCustomer.bind(customerMiddleware),
  customerService.deleteCustomer.bind(customerService)
);

export default router;
