import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import CompanyBusinessModelService from "../services/companyBusinessModel";
import CompanyBusinessModelMiddleware from "../middlewares/companyBusinessModel";

const router = Router();
const service = new CompanyBusinessModelService();
const middleware = new CompanyBusinessModelMiddleware();

router.get("/", authenticateToken, service.getCompanyBusinessModels.bind(service));
router.get("/:id", authenticateToken, service.getCompanyBusinessModel.bind(service));
router.post("/", authenticateToken, middleware.createCompanyBusinessModel.bind(middleware), service.createCompanyBusinessModel.bind(service));
router.patch("/:id", authenticateToken, middleware.updateCompanyBusinessModel.bind(middleware), service.updateCompanyBusinessModel.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteCompanyBusinessModel.bind(middleware), service.deleteCompanyBusinessModel.bind(service));

export default router;
