import { Router } from "express";
import ServiceCompanyService from "../services/serviceCompany";
import ServiceCompanyMiddleware from "../middlewares/serviceCompany";
import authenticateToken from "../middlewares/auth";
import authorizeRoles from "../middlewares/roleMiddleware";

const serviceCompanyRoute = Router();
const serviceCompanyService = new ServiceCompanyService();
const serviceCompanyMiddleware = new ServiceCompanyMiddleware();

serviceCompanyRoute.get(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyService.getServiceCompanies.bind(serviceCompanyService)
);
serviceCompanyRoute.get(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyMiddleware.deleteServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.getServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyMiddleware.createServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.createServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyMiddleware.updateServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.updateServiceCompany.bind(serviceCompanyService)
);
serviceCompanyRoute.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  serviceCompanyMiddleware.deleteServiceCompany.bind(serviceCompanyMiddleware),
  serviceCompanyService.deleteServiceCompany.bind(serviceCompanyService)
);

export default serviceCompanyRoute;
