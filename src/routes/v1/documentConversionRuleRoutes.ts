import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { DocumentConversionRuleController } from "../../controllers/documentConversionRuleController";

const router = Router(), controller = new DocumentConversionRuleController();
router.use(authenticateToken);
router.get("/", controller.list.bind(controller));
router.post("/", controller.create.bind(controller));
router.patch("/:id", controller.update.bind(controller));
router.delete("/:id", controller.remove.bind(controller));
export default router;
