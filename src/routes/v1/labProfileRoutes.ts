import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { LabProfileController } from "../../controllers/labProfileController";

const router = Router();
const controller = new LabProfileController();

router.use(authenticateToken);
router.get("/taxonomy", (req, res, next) => controller.taxonomy(req, res).catch(next));
router.post("/taxonomy", (req, res, next) => controller.requestTaxonomy(req, res).catch(next));
router.post("/taxonomy/requests", (req, res, next) => controller.requestTaxonomy(req, res).catch(next));
router.get("/taxonomy/admin", (req, res, next) => controller.adminTaxonomy(req, res).catch(next));
router.post("/taxonomy/admin", (req, res, next) => controller.createTaxonomy(req, res).catch(next));
router.patch("/taxonomy/admin/:id", (req, res, next) => controller.reviewTaxonomy(req, res).catch(next));
router.delete("/taxonomy/admin/:id", (req, res, next) => controller.deleteTaxonomy(req, res).catch(next));
router.get("/directory", (req, res, next) => controller.directory(req, res).catch(next));
router.get("/directory/:id", (req, res, next) => controller.detail(req, res).catch(next));
router.get("/draft", (req, res, next) => controller.getDraft(req, res).catch(next));
router.put("/draft", (req, res, next) => controller.saveDraft(req, res).catch(next));
router.post("/submit", (req, res, next) => controller.submit(req, res).catch(next));
router.get("/approvals", (req, res, next) => controller.approvals(req, res).catch(next));
router.patch("/approvals/:id", (req, res, next) => controller.review(req, res).catch(next));

export default router;

