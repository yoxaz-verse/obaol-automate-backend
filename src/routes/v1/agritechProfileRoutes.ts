import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { AgritechProfileController } from "../../controllers/agritechProfileController";

const router = Router();
const controller = new AgritechProfileController();
router.use(authenticateToken);
router.get("/directory", (req, res, next) => controller.directory(req, res).catch(next));
router.get("/directory/:id", (req, res, next) => controller.detail(req, res).catch(next));
router.get("/mine", (req, res, next) => controller.mine(req, res).catch(next));
router.put("/mine", (req, res, next) => controller.save(req, res).catch(next));
router.post("/mine/submit", (req, res, next) => controller.submit(req, res).catch(next));
router.post("/mine/archive", (req, res, next) => controller.archive(req, res).catch(next));
router.post("/mine/restore", (req, res, next) => controller.restore(req, res).catch(next));
router.get("/approvals", (req, res, next) => controller.approvals(req, res).catch(next));
router.patch("/approvals/:id", (req, res, next) => controller.review(req, res).catch(next));
export default router;
