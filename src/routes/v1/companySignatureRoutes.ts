import { Router } from "express";
import multer from "multer";
import authenticateToken from "../../middlewares/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
router.use(authenticateToken);
router.all("/", (_req, res) => res.status(410).json({ success: false, code: "LEGACY_SIGNATURE_RETIRED", message: "Use Signature Management in Settings." }));
export { upload };
export default router;
