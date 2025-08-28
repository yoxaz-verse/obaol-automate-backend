import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import SubIntentService from "../services/subIntent";
import SubIntentMiddleware from "../middlewares/subIntent";

const router = Router();
const service = new SubIntentService();
const middleware = new SubIntentMiddleware();

router.get("/", authenticateToken, service.getSubIntents.bind(service));
router.get("/:id", authenticateToken, service.getSubIntent.bind(service));
router.post("/", authenticateToken, middleware.createSubIntent.bind(middleware), service.createSubIntent.bind(service));
router.patch("/:id", authenticateToken, middleware.updateSubIntent.bind(middleware), service.updateSubIntent.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteSubIntent.bind(middleware), service.deleteSubIntent.bind(service));

export default router;
