import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { CompanyMailController } from "../../controllers/companyMailController";
const router = Router(), controller = new CompanyMailController();
router.get("/status", authenticateToken, controller.status.bind(controller));
router.post("/:provider/authorize", authenticateToken, controller.authorize.bind(controller));
router.get("/:provider/callback", authenticateToken, controller.callback.bind(controller));
router.delete("/", authenticateToken, controller.disconnect.bind(controller));
export default router;
