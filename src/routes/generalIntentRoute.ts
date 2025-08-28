import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import GeneralIntentService from "../services/generalIntent";
import GeneralIntentMiddleware from "../middlewares/generalIntent";

const router = Router();
const service = new GeneralIntentService();
const middleware = new GeneralIntentMiddleware();

router.get("/", authenticateToken, service.getGeneralIntents.bind(service));
router.get("/:id", authenticateToken, service.getGeneralIntent.bind(service));
router.post("/", authenticateToken, middleware.createGeneralIntent.bind(middleware), service.createGeneralIntent.bind(service));
router.patch("/:id", authenticateToken, middleware.updateGeneralIntent.bind(middleware), service.updateGeneralIntent.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteGeneralIntent.bind(middleware), service.deleteGeneralIntent.bind(service));

export default router;
