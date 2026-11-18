import { Router } from "express";
import multer from "multer";
import authenticateToken from "../../middlewares/auth";
import { SignatureController } from "../../controllers/signatureController";

const router = Router(), controller = new SignatureController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
router.use(authenticateToken);
router.get("/", controller.list.bind(controller));
router.post("/", upload.single("signature"), controller.upload.bind(controller));
router.get("/:id/preview", controller.preview.bind(controller));
router.post("/:id/activate", controller.activate.bind(controller));
router.delete("/:id", controller.remove.bind(controller));
export default router;
