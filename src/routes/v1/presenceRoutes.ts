import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { PresenceController } from "../../controllers/presenceController";

const router = Router();

router.post("/ping", authenticateToken, PresenceController.ping);

export default router;

