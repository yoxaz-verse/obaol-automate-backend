import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { TradeDocumentController } from "../../controllers/tradeDocumentController";

const router = Router();
const controller = new TradeDocumentController();

router.get("/customers", authenticateToken, controller.listCustomers.bind(controller));
router.post("/customers", authenticateToken, controller.createCustomer.bind(controller));
router.patch("/customers/:id", authenticateToken, controller.updateCustomer.bind(controller));
router.get("/share/:token", controller.getShared.bind(controller));
router.post("/share/:token/decision", authenticateToken, controller.buyerDecision.bind(controller));
router.post("/", authenticateToken, controller.create.bind(controller));
router.get("/", authenticateToken, controller.list.bind(controller));
router.post("/:id/email", authenticateToken, controller.emailDocument.bind(controller));
router.post("/:id/issue", authenticateToken, controller.issue.bind(controller));
router.post("/:id/invite", authenticateToken, controller.invite.bind(controller));
router.post("/:id/revoke-invite", authenticateToken, controller.revokeInvite.bind(controller));
router.post("/:id/decision", authenticateToken, controller.recordDecision.bind(controller));
router.post("/:id/revise", authenticateToken, controller.revise.bind(controller));
router.get("/:id/revisions", authenticateToken, controller.revisions.bind(controller));
router.post("/:id/to-invoice", authenticateToken, controller.toInvoice.bind(controller));
router.post("/:id/payments", authenticateToken, controller.addPayment.bind(controller));
router.get("/:id/pdf", authenticateToken, controller.pdf.bind(controller));
router.get("/:id", authenticateToken, controller.getById.bind(controller));
router.patch("/:id", authenticateToken, controller.update.bind(controller));

export default router;
