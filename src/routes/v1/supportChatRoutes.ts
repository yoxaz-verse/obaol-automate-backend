import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { supportChatController } from "../../controllers/supportChatController";

const router = Router();
router.use(authenticateToken);
router.get("/availability", supportChatController.availability.bind(supportChatController));
router.get("/agents/online", supportChatController.onlineAgents.bind(supportChatController));
router.patch("/agents/me/availability", supportChatController.setAvailability.bind(supportChatController));
router.get("/conversations", supportChatController.listConversations.bind(supportChatController));
router.post("/conversations", supportChatController.createConversation.bind(supportChatController));
router.get("/conversations/:id", supportChatController.getConversation.bind(supportChatController));
router.post("/conversations/:id/claim", supportChatController.claim.bind(supportChatController));
router.patch("/conversations/:id/reassign", supportChatController.reassign.bind(supportChatController));
router.post("/conversations/:id/resolve", supportChatController.resolve.bind(supportChatController));
router.post("/conversations/:id/reopen", supportChatController.reopen.bind(supportChatController));
router.get("/conversations/:id/messages", supportChatController.listMessages.bind(supportChatController));
router.post("/conversations/:id/messages", supportChatController.postMessage.bind(supportChatController));
export default router;
