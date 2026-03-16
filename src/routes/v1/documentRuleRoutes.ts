import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { DocumentRuleController } from "../../controllers/documentRuleController";

const router = Router();
const controller = new DocumentRuleController();

router.use(authenticateToken);

router.get("/", controller.list.bind(controller));
router.post("/", controller.create.bind(controller));
router.post("/seed", controller.seed.bind(controller));
router.patch("/:id", controller.update.bind(controller));
router.delete("/:id", controller.remove.bind(controller));

export default router;
