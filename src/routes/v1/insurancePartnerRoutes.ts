import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { insurancePartnerController as c } from "../../controllers/insurancePartnerController";
const router = Router(); router.use(authenticateToken);
router.get("/portfolio", c.getPortfolio.bind(c)); router.put("/portfolio", c.savePortfolio.bind(c)); router.post("/portfolio/submit", c.submitPortfolio.bind(c));
router.get("/approvals", c.approvals.bind(c)); router.patch("/approvals/:id", c.review.bind(c));
router.get("/directory", c.directory.bind(c)); router.get("/directory/:id", c.detail.bind(c)); router.post("/directory/:id/requests", c.createRequest.bind(c));
router.get("/requests", c.requests.bind(c)); router.patch("/requests/:id/status", c.transition.bind(c));
export default router;
