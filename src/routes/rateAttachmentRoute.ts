// src/routes/rateAttachmentRoutes.ts
import { Router } from "express";
import authenticate from "../middlewares/auth";
import rateAttachmentController from "../controllers/rateAttachmentController";

const router = Router();

// Fetch attachments for a rate
router.get(
  "/rate-attachments/:variantRateId",
  authenticate,
  rateAttachmentController.getByRate
);

// Create or update attachments
router.put(
  "/rate-attachments/:variantRateId",
  authenticate,
  rateAttachmentController.upsert
);

// Delete attachments
router.delete(
  "/rate-attachments/:variantRateId",
  authenticate,
  rateAttachmentController.deleteAll
);

export default router;
