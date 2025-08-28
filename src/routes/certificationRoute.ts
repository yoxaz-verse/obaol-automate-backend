import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import CertificationService from "../services/certification";
import CertificationMiddleware from "../middlewares/certification";

const router = Router();
const service = new CertificationService();
const middleware = new CertificationMiddleware();

router.get("/", authenticateToken, service.getCertifications.bind(service));
router.get("/:id", authenticateToken, service.getCertification.bind(service));
router.post("/", authenticateToken, middleware.createCertification.bind(middleware), service.createCertification.bind(service));
router.patch("/:id", authenticateToken, middleware.updateCertification.bind(middleware), service.updateCertification.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteCertification.bind(middleware), service.deleteCertification.bind(service));

export default router;
