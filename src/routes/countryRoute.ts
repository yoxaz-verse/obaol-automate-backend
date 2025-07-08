import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import CountryService from "../services/country";
import CountryMiddleware from "../middlewares/country";

const router = Router();
const service = new CountryService();
const middleware = new CountryMiddleware();

router.get("/", authenticateToken, service.getCountrys.bind(service));
router.get("/:id", authenticateToken, service.getCountry.bind(service));
router.post("/", authenticateToken, middleware.createCountry.bind(middleware), service.createCountry.bind(service));
router.patch("/:id", authenticateToken, middleware.updateCountry.bind(middleware), service.updateCountry.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteCountry.bind(middleware), service.deleteCountry.bind(service));

export default router;
