import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { customerSupportAgentController } from "../../controllers/customerSupportAgentController";

const router = Router();
router.use(authenticateToken);
router.get("/", customerSupportAgentController.list.bind(customerSupportAgentController));
router.post("/", customerSupportAgentController.create.bind(customerSupportAgentController));
router.patch("/:id", customerSupportAgentController.update.bind(customerSupportAgentController));
router.delete("/:id", customerSupportAgentController.remove.bind(customerSupportAgentController));
export default router;
