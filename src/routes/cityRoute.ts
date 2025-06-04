import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import CityService from "../services/city";
import CityMiddleware from "../middlewares/city";

const router = Router();
const service = new CityService();
const middleware = new CityMiddleware();

router.get("/", authenticateToken, service.getCitys.bind(service));
router.get("/:id", authenticateToken, service.getCity.bind(service));
router.post("/", authenticateToken, middleware.createCity.bind(middleware), service.createCity.bind(service));
router.patch("/:id", authenticateToken, middleware.updateCity.bind(middleware), service.updateCity.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteCity.bind(middleware), service.deleteCity.bind(service));

export default router;
