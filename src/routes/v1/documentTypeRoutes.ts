import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { DocumentTypeController } from "../../controllers/documentTypeController";

const router = Router();
const controller = new DocumentTypeController();

router.use(authenticateToken);
router.get("/", controller.list.bind(controller));
router.post("/", controller.create.bind(controller));
router.patch("/:id", controller.update.bind(controller));
router.delete("/:id", controller.remove.bind(controller));

export default router;
