import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import EnquiryProcessStatusService from "../services/enquiryProcessStatus";
import EnquiryProcessStatusMiddleware from "../middlewares/enquiryProcessStatus";

const router = Router();
const service = new EnquiryProcessStatusService();
const middleware = new EnquiryProcessStatusMiddleware();

router.get("/", authenticateToken, service.getEnquiryProcessStatuss.bind(service));
router.get("/:id", authenticateToken, service.getEnquiryProcessStatus.bind(service));
router.post("/", authenticateToken, middleware.createEnquiryProcessStatus.bind(middleware), service.createEnquiryProcessStatus.bind(service));
router.patch("/:id", authenticateToken, middleware.updateEnquiryProcessStatus.bind(middleware), service.updateEnquiryProcessStatus.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteEnquiryProcessStatus.bind(middleware), service.deleteEnquiryProcessStatus.bind(service));

export default router;
