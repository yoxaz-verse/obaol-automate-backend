import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import CompanyTypeService from "../services/companyType";
import CompanyTypeMiddleware from "../middlewares/companyType";

const router = Router();
const service = new CompanyTypeService();
const middleware = new CompanyTypeMiddleware();

router.get("/", authenticateToken, service.getCompanyTypes.bind(service));
router.get("/:id", authenticateToken, service.getCompanyType.bind(service));
router.post("/", authenticateToken, middleware.createCompanyType.bind(middleware), service.createCompanyType.bind(service));
router.patch("/:id", authenticateToken, middleware.updateCompanyType.bind(middleware), service.updateCompanyType.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteCompanyType.bind(middleware), service.deleteCompanyType.bind(service));

export default router;
