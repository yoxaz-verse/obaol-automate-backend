import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import LanguageService from "../services/language";
import LanguageMiddleware from "../middlewares/language";

const router = Router();
const service = new LanguageService();
const middleware = new LanguageMiddleware();

router.get("/", authenticateToken, service.getLanguages.bind(service));
router.get("/:id", authenticateToken, service.getLanguage.bind(service));
router.post("/", authenticateToken, middleware.createLanguage.bind(middleware), service.createLanguage.bind(service));
router.patch("/:id", authenticateToken, middleware.updateLanguage.bind(middleware), service.updateLanguage.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteLanguage.bind(middleware), service.deleteLanguage.bind(service));

export default router;
