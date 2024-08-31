import { Router } from "express";
import ServiceCompanyService from "../services/serviceCompany";
import ServiceCompanyMiddleware from "../middlewares/serviceCompany";

const serviceCompanyRoute = Router();
const serviceCompanyService = new ServiceCompanyService();
const serviceCompanyMiddleware = new ServiceCompanyMiddleware();

serviceCompanyRoute.get(
  "/",
  serviceCompanyService.getServiceCompanies.bind(serviceCompanyService)
);
serviceCompanyRoute.get(
  "/:id",
  serviceCompanyMiddleware.getServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.getServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.post(
  "/",
  serviceCompanyMiddleware.createServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.createServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.patch(
  "/:id",
  serviceCompanyMiddleware.updateServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.updateServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.delete(
  "/:id",
  serviceCompanyMiddleware.deleteServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.deleteServiceCompany.bind(serviceCompanyService)
);

export default serviceCompanyRoute;
