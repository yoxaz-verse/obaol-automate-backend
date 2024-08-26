import { Router } from "express";
import ServiceCompanyService from "../services/serviceCompany";
import ServiceCompanyMiddleware from "../middlewares/serviceCompany";

const router = Router();
const serviceCompanyService = new ServiceCompanyService();
const serviceCompanyMiddleware = new ServiceCompanyMiddleware();

router.get(
  "/",
  serviceCompanyMiddleware.getServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.getServiceCompanies.bind(serviceCompanyService)
);
router.get(
  "/:id",
  serviceCompanyMiddleware.getServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.getServiceCompany.bind(serviceCompanyService)
);
router.post(
  "/",
  serviceCompanyMiddleware.createServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.createServiceCompany.bind(serviceCompanyService)
);
router.put(
  "/:id",
  serviceCompanyMiddleware.updateServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.updateServiceCompany.bind(serviceCompanyService)
);
router.delete(
  "/:id",
  serviceCompanyMiddleware.deleteServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.deleteServiceCompany.bind(serviceCompanyService)
);

export default router;
