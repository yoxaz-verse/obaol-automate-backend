import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import CompanyStageService from "../services/companyStage";
import CompanyStageMiddleware from "../middlewares/companyStage";

const router = Router();
const service = new CompanyStageService();
const middleware = new CompanyStageMiddleware();

router.get("/", authenticateToken, service.getCompanyStages.bind(service));
router.get("/:id", authenticateToken, service.getCompanyStage.bind(service));
router.post("/", authenticateToken, middleware.createCompanyStage.bind(middleware), service.createCompanyStage.bind(service));
router.patch("/:id", authenticateToken, middleware.updateCompanyStage.bind(middleware), service.updateCompanyStage.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteCompanyStage.bind(middleware), service.deleteCompanyStage.bind(service));

export default router;
