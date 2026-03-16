import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { notificationController } from "../../controllers/notificationController";

const router = Router();

router.use(authenticateToken);

router.get("/", notificationController.list.bind(notificationController));
router.get("/unread-count", notificationController.unreadCount.bind(notificationController));
router.get("/unread-summary", notificationController.unreadSummary.bind(notificationController));
router.patch("/mark-section-read", notificationController.markSectionRead.bind(notificationController));
router.patch("/:id/read", notificationController.markRead.bind(notificationController));
router.patch("/read-all", notificationController.markAllRead.bind(notificationController));

export default router;
