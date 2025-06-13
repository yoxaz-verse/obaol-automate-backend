import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import PincodeEntryService from "../services/pincodeEntry";
import PincodeEntryMiddleware from "../middlewares/pincodeEntry";

const router = Router();
const service = new PincodeEntryService();
const middleware = new PincodeEntryMiddleware();

router.get("/", authenticateToken, service.getPincodeEntrys.bind(service));
router.get("/:id", authenticateToken, service.getPincodeEntry.bind(service));
router.post("/", authenticateToken, middleware.createPincodeEntry.bind(middleware), service.createPincodeEntry.bind(service));
router.patch("/:id", authenticateToken, middleware.updatePincodeEntry.bind(middleware), service.updatePincodeEntry.bind(service));
router.delete("/:id", authenticateToken, middleware.deletePincodeEntry.bind(middleware), service.deletePincodeEntry.bind(service));

export default router;
