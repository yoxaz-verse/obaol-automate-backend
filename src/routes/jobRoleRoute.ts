import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import JobRoleService from "../services/jobRole";
import JobRoleMiddleware from "../middlewares/jobRole";

const router = Router();
const service = new JobRoleService();
const middleware = new JobRoleMiddleware();

router.get("/", authenticateToken, service.getJobRoles.bind(service));
router.get("/:id", authenticateToken, service.getJobRole.bind(service));
router.post("/", authenticateToken, middleware.createJobRole.bind(middleware), service.createJobRole.bind(service));
router.patch("/:id", authenticateToken, middleware.updateJobRole.bind(middleware), service.updateJobRole.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteJobRole.bind(middleware), service.deleteJobRole.bind(service));

export default router;
