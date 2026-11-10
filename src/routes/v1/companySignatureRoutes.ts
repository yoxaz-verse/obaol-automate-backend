import { Router } from "express";
import multer from "multer";
import authenticateToken from "../../middlewares/auth";
import { CompanySignatureController } from "../../controllers/companySignatureController";

const router = Router(), controller = new CompanySignatureController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
router.use(authenticateToken);
router.get("/", controller.get.bind(controller));
router.post("/", upload.single("signature"), controller.save.bind(controller));
router.delete("/", controller.remove.bind(controller));
export { upload };
export default router;
