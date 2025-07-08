import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import UnLoCodeStatusService from "../services/unLoCodeStatus";
import UnLoCodeStatusMiddleware from "../middlewares/unLoCodeStatus";

const router = Router();
const service = new UnLoCodeStatusService();
const middleware = new UnLoCodeStatusMiddleware();

router.get("/", authenticateToken, service.getUnLoCodeStatuss.bind(service));
router.get("/:id", authenticateToken, service.getUnLoCodeStatus.bind(service));
router.post("/", authenticateToken, middleware.createUnLoCodeStatus.bind(middleware), service.createUnLoCodeStatus.bind(service));
router.patch("/:id", authenticateToken, middleware.updateUnLoCodeStatus.bind(middleware), service.updateUnLoCodeStatus.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteUnLoCodeStatus.bind(middleware), service.deleteUnLoCodeStatus.bind(service));

export default router;
