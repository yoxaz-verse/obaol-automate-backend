import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import ResearchedCompanyService from "../services/researchedCompany";
import ResearchedCompanyMiddleware from "../middlewares/researchedCompany";

const router = Router();
const service = new ResearchedCompanyService();
const middleware = new ResearchedCompanyMiddleware();

router.get("/", authenticateToken, service.getResearchedCompanys.bind(service));
router.get("/:id", authenticateToken, service.getResearchedCompany.bind(service));
router.post("/", authenticateToken, middleware.createResearchedCompany.bind(middleware), service.createResearchedCompany.bind(service));
router.patch("/:id", authenticateToken, middleware.updateResearchedCompany.bind(middleware), service.updateResearchedCompany.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteResearchedCompany.bind(middleware), service.deleteResearchedCompany.bind(service));

export default router;
