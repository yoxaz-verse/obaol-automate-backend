import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import AbbreviationService from "../services/abbreviation";
import AbbreviationMiddleware from "../middlewares/abbreviation";

const router = Router();
const service = new AbbreviationService();
const middleware = new AbbreviationMiddleware();

router.get("/", authenticateToken, service.getAbbreviations.bind(service));
router.get("/:id", authenticateToken, service.getAbbreviation.bind(service));
router.post("/", authenticateToken, middleware.createAbbreviation.bind(middleware), service.createAbbreviation.bind(service));
router.patch("/:id", authenticateToken, middleware.updateAbbreviation.bind(middleware), service.updateAbbreviation.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteAbbreviation.bind(middleware), service.deleteAbbreviation.bind(service));

export default router;
