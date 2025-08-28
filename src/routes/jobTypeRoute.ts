import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import JobTypeService from "../services/jobType";
import JobTypeMiddleware from "../middlewares/jobType";

const router = Router();
const service = new JobTypeService();
const middleware = new JobTypeMiddleware();

router.get("/", authenticateToken, service.getJobTypes.bind(service));
router.get("/:id", authenticateToken, service.getJobType.bind(service));
router.post("/", authenticateToken, middleware.createJobType.bind(middleware), service.createJobType.bind(service));
router.patch("/:id", authenticateToken, middleware.updateJobType.bind(middleware), service.updateJobType.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteJobType.bind(middleware), service.deleteJobType.bind(service));

export default router;
