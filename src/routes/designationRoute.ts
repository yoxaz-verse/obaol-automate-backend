import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import DesignationService from "../services/designation";
import DesignationMiddleware from "../middlewares/designation";

const router = Router();
const service = new DesignationService();
const middleware = new DesignationMiddleware();

router.get("/", authenticateToken, service.getDesignations.bind(service));
router.get("/:id", authenticateToken, service.getDesignation.bind(service));
router.post("/", authenticateToken, middleware.createDesignation.bind(middleware), service.createDesignation.bind(service));
router.patch("/:id", authenticateToken, middleware.updateDesignation.bind(middleware), service.updateDesignation.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteDesignation.bind(middleware), service.deleteDesignation.bind(service));

export default router;
