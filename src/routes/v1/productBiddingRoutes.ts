import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { productBiddingController as controller } from "../../controllers/productBiddingController";

const router = Router();
router.use(authenticateToken);
router.get("/", controller.list.bind(controller));
router.post("/", controller.create.bind(controller));
router.patch("/:id", controller.update.bind(controller));
router.post("/:id/publish", controller.publish.bind(controller));
router.post("/:id/cancel", controller.cancel.bind(controller));
router.post("/:id/close", controller.close.bind(controller));
router.put("/:id/offer", controller.submitOffer.bind(controller));
router.delete("/:id/offer", controller.withdrawOffer.bind(controller));
router.post("/:id/award", controller.award.bind(controller));
router.post("/:id/confirm-enquiry", controller.confirmEnquiry.bind(controller));
export default router;
