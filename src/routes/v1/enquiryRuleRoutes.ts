import express from "express";
import { enquiryRuleController } from "../../controllers/enquiryRuleController";
import authenticateToken from "../../middlewares/auth";

const router = express.Router();

router.get("/", authenticateToken, enquiryRuleController.list);
router.post("/", authenticateToken, enquiryRuleController.create);
router.patch("/:id", authenticateToken, enquiryRuleController.update);
router.delete("/:id", authenticateToken, enquiryRuleController.remove);

export default router;
