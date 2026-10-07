import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { supportContactController } from "../../controllers/supportContactController";

const router = Router();

router.use(authenticateToken);
router.get("/", supportContactController.list.bind(supportContactController));
router.post("/", supportContactController.create.bind(supportContactController));
router.patch("/:id", supportContactController.update.bind(supportContactController));

export default router;
