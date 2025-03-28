import EnquiryMiddleware from "../middlewares/enquiry";
import { EnquiryService } from "../services/enquiry";
import { Router } from "express";

const router = Router();
const enquiryService = new EnquiryService();
const enquiryMiddleware = new EnquiryMiddleware();

/**
 * Example routes:
 * POST   /enquiries        -> createEnquiry
 * GET    /enquiries        -> getEnquiries
 * GET    /enquiries/:id    -> getEnquiry
 * PUT    /enquiries/:id    -> updateEnquiry
 * DELETE /enquiries/:id    -> deleteEnquiry
 */

router.post(
  "/",
  enquiryMiddleware.createEnquiry,
  enquiryService.createEnquiry.bind(enquiryService)
);

router.get("/", enquiryService.getEnquiries.bind(enquiryService));

router.get(
  "/:id",
  enquiryMiddleware.validateEnquiryId,
  enquiryService.getEnquiry.bind(enquiryService)
);

router.put(
  "/:id",
  enquiryMiddleware.validateEnquiryId,
  enquiryMiddleware.updateEnquiry,
  enquiryService.updateEnquiry.bind(enquiryService)
);

router.delete(
  "/:id",
  enquiryMiddleware.validateEnquiryId,
  enquiryService.deleteEnquiry.bind(enquiryService)
);

export default router;
