import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import DivisionService from "../services/division";
import DivisionMiddleware from "../middlewares/division";

const router = Router();
const service = new DivisionService();
const middleware = new DivisionMiddleware();

router.get("/", authenticateToken, service.getDivisions.bind(service));
router.get("/:id", authenticateToken, service.getDivision.bind(service));
router.post("/", authenticateToken, middleware.createDivision.bind(middleware), service.createDivision.bind(service));
router.patch("/:id", authenticateToken, middleware.updateDivision.bind(middleware), service.updateDivision.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteDivision.bind(middleware), service.deleteDivision.bind(service));

export default router;
