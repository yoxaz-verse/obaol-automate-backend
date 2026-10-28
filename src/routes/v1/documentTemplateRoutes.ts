import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { DocumentTemplateController } from "../../controllers/documentTemplateController";

const router = Router();
const controller = new DocumentTemplateController();

router.use(authenticateToken);
router.get("/", controller.list.bind(controller));
router.get("/available", controller.available.bind(controller));
router.get("/variables", controller.variables.bind(controller));
router.post("/seed", controller.seed.bind(controller));
router.post("/preview", controller.preview.bind(controller));
router.post("/generate", controller.generate.bind(controller));
router.post("/", controller.create.bind(controller));
router.patch("/:id", controller.update.bind(controller));
router.post("/:id/publish", controller.publish.bind(controller));
router.post("/:id/duplicate", controller.duplicate.bind(controller));
router.post("/:id/default", controller.setDefault.bind(controller));
router.post("/:id/deactivate", controller.deactivate.bind(controller));
router.get("/:id", controller.getById.bind(controller));

export default router;
