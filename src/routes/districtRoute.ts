import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import DistrictService from "../services/district";
import DistrictMiddleware from "../middlewares/district";

const router = Router();
const service = new DistrictService();
const middleware = new DistrictMiddleware();

router.get("/", authenticateToken, service.getDistricts.bind(service));
router.get("/:id", authenticateToken, service.getDistrict.bind(service));
router.post("/", authenticateToken, middleware.createDistrict.bind(middleware), service.createDistrict.bind(service));
router.patch("/:id", authenticateToken, middleware.updateDistrict.bind(middleware), service.updateDistrict.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteDistrict.bind(middleware), service.deleteDistrict.bind(service));

export default router;
