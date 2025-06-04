import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import StateService from "../services/state";
import StateMiddleware from "../middlewares/state";

const router = Router();
const service = new StateService();
const middleware = new StateMiddleware();

router.get("/", authenticateToken, service.getStates.bind(service));
router.get("/:id", authenticateToken, service.getState.bind(service));
router.post("/", authenticateToken, middleware.createState.bind(middleware), service.createState.bind(service));
router.patch("/:id", authenticateToken, middleware.updateState.bind(middleware), service.updateState.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteState.bind(middleware), service.deleteState.bind(service));

export default router;
