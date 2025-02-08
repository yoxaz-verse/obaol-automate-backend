import authenticateToken from "../middlewares/auth";
import StatusHistoryService from "../services/statusHistory";
import { Router } from "express";

const router = Router();
const statusHistoryService = new StatusHistoryService();

// GET all timeSheet
router.get(
  "/",
  authenticateToken,
  statusHistoryService.getStatusHistory.bind(statusHistoryService)
);

export default router;
