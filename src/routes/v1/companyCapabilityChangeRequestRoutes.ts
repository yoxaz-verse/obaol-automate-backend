import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { companyCapabilityChangeRequestController } from "../../controllers/companyCapabilityChangeRequestController";

const router = Router();
router.use(authenticateToken);
router.get("/", companyCapabilityChangeRequestController.list.bind(companyCapabilityChangeRequestController));
router.post("/", companyCapabilityChangeRequestController.create.bind(companyCapabilityChangeRequestController));
router.patch("/:id/review", companyCapabilityChangeRequestController.review.bind(companyCapabilityChangeRequestController));

export default router;
