import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import UnLoCodeAdminAreaService from "../services/unLoCodeAdminArea";
import UnLoCodeAdminAreaMiddleware from "../middlewares/unLoCodeAdminArea";

const router = Router();
const service = new UnLoCodeAdminAreaService();
const middleware = new UnLoCodeAdminAreaMiddleware();

router.get("/", authenticateToken, service.getUnLoCodeAdminAreas.bind(service));
router.get("/:id", authenticateToken, service.getUnLoCodeAdminArea.bind(service));
router.post("/", authenticateToken, middleware.createUnLoCodeAdminArea.bind(middleware), service.createUnLoCodeAdminArea.bind(service));
router.patch("/:id", authenticateToken, middleware.updateUnLoCodeAdminArea.bind(middleware), service.updateUnLoCodeAdminArea.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteUnLoCodeAdminArea.bind(middleware), service.deleteUnLoCodeAdminArea.bind(service));

export default router;
