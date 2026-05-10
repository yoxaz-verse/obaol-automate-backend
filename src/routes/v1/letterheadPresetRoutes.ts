import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { LetterheadPresetController } from "../../controllers/letterheadPresetController";

const router = Router();
const controller = new LetterheadPresetController();

router.use(authenticateToken);
router.get("/", controller.list.bind(controller));
router.post("/", controller.create.bind(controller));
router.patch("/:id", controller.update.bind(controller));
router.delete("/:id", controller.remove.bind(controller));

export default router;
