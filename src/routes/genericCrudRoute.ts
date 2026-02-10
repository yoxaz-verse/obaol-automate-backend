import { Router } from "express";
import { GenericCrudController } from "../controllers/genericCrudController";
import authenticateToken from "../middlewares/auth";
import { validateEntity } from "../middlewares/validateEntity";

const router = Router();
const controller = new GenericCrudController();

// We need to capture the entity name in the path
// Matches /api/v1/web/:entity and /api/v1/web/:entity/:id
router.all("/:entity", authenticateToken, validateEntity, controller.handleRequest.bind(controller));
router.all("/:entity/:id", authenticateToken, validateEntity, controller.handleRequest.bind(controller));
router.all("/:entity/*", authenticateToken, validateEntity, controller.handleRequest.bind(controller)); // Catch sub-paths if any

export default router;
