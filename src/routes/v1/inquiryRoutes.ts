import { Router } from "express";
import { InquiryController } from "../../controllers/InquiryController";
import authenticateToken from "../../middlewares/auth";

const router = Router();
const inquiryController = new InquiryController();

/**
 * All inquiry routes require authentication
 */
router.use(authenticateToken);

/**
 * Create inquiry
 * POST /api/v1/web/inquiries
 */
router.post("/", inquiryController.create.bind(inquiryController));

/**
 * List inquiries with role-based filtering
 * GET /api/v1/web/inquiries?status=NEW&page=1&limit=20
 */
router.get("/", inquiryController.list.bind(inquiryController));

/**
 * List sea ports only (UN/LOCODE function code "1")
 * GET /api/v1/web/inquiries/sea-ports?country=...
 */
router.get("/sea-ports", inquiryController.listSeaPorts.bind(inquiryController));
router.get("/buyer-options", inquiryController.listBuyerOptions.bind(inquiryController));

/**
 * Get inquiry by ID
 * GET /api/v1/web/inquiries/:id
 */
router.get("/:id", inquiryController.getById.bind(inquiryController));

/**
 * Update inquiry (responsibility/specifications/context)
 * PATCH /api/v1/web/inquiries/:id
 */
router.patch("/:id", inquiryController.update.bind(inquiryController));

/**
 * Update inquiry status (validates state transitions)
 * PATCH /api/v1/web/inquiries/:id/status
 * Body: { status: "CONTACTED" }
 */
router.patch("/:id/status", inquiryController.updateStatus.bind(inquiryController));

/**
 * Update inquiry workflow stage (industry flow)
 * PATCH /api/v1/web/inquiries/:id/workflow-stage
 * Body: { workflowStage: "ORDER_CONFIRMED" }
 */
router.patch("/:id/workflow-stage", inquiryController.updateWorkflowStage.bind(inquiryController));

/**
 * Request volunteer as handler (supplier owner/deal closer)
 * POST /api/v1/web/inquiries/:id/handler-volunteer
 */
router.post("/:id/handler-volunteer", inquiryController.requestHandlerVolunteer.bind(inquiryController));

/**
 * Review volunteer request (admin only)
 * PATCH /api/v1/web/inquiries/:id/handler-volunteer
 */
router.patch("/:id/handler-volunteer", inquiryController.reviewHandlerVolunteer.bind(inquiryController));

/**
 * Assign operator to inquiry (admin only)
 * PATCH /api/v1/web/inquiries/:id/assign
 * Body: { operatorId: "..." }
 */
router.patch("/:id/assign", inquiryController.assignOperator.bind(inquiryController));

/**
 * Seller commits inquiry until a date
 * PATCH /api/v1/web/inquiries/:id/commit
 */
router.patch("/:id/commit", inquiryController.commitUntil.bind(inquiryController));

/**
 * Seller accepts inquiry
 * PATCH /api/v1/web/inquiries/:id/seller-accept
 */
router.patch("/:id/seller-accept", inquiryController.sellerAccept.bind(inquiryController));

/**
 * Buyer confirms inquiry (all good to go)
 * PATCH /api/v1/web/inquiries/:id/buyer-confirm
 */
router.patch("/:id/buyer-confirm", inquiryController.buyerConfirm.bind(inquiryController));

/**
 * Buyer requests clarification on quotation
 * PATCH /api/v1/web/inquiries/:id/request-clarification
 */
router.patch("/:id/request-clarification", inquiryController.requestClarification.bind(inquiryController));
router.patch("/:id/revision-reply", inquiryController.replyToRevision.bind(inquiryController));

/**
 * Apply workflow action
 * PATCH /api/v1/web/inquiries/:id/actions
 */
router.patch("/:id/actions", inquiryController.applyAction.bind(inquiryController));

/**
 * Finalize responsibility plan and generate execution inquiries
 * PATCH /api/v1/web/inquiries/:id/finalize-responsibilities
 */
router.patch("/:id/finalize-responsibilities", inquiryController.finalizeResponsibilities.bind(inquiryController));

/**
 * Update execution inquiry (bid/commit/status)
 * PATCH /api/v1/web/inquiries/:id/execution-inquiries/:type
 */
router.patch("/:id/execution-inquiries/:type", inquiryController.updateExecutionInquiry.bind(inquiryController));

/**
 * Get inquiry event history (admin/assigned operator only)
 * GET /api/v1/web/inquiries/:id/events
 */
router.get("/:id/events", inquiryController.getEvents.bind(inquiryController));

export default router;
