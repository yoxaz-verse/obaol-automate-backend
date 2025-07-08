import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import UnLoCodeService from "../services/unLoCode";
import UnLoCodeMiddleware from "../middlewares/unLoCode";

const router = Router();
const service = new UnLoCodeService();
const middleware = new UnLoCodeMiddleware();

router.get("/", authenticateToken, service.getUnLoCodes.bind(service));
router.get("/:id", authenticateToken, service.getUnLoCode.bind(service));
router.post("/", authenticateToken, middleware.createUnLoCode.bind(middleware), service.createUnLoCode.bind(service));
router.patch("/:id", authenticateToken, middleware.updateUnLoCode.bind(middleware), service.updateUnLoCode.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteUnLoCode.bind(middleware), service.deleteUnLoCode.bind(service));

export default router;
