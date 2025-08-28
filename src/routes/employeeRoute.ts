import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import EmployeeService from "../services/employee";
import EmployeeMiddleware from "../middlewares/employee";

const router = Router();
const service = new EmployeeService();
const middleware = new EmployeeMiddleware();

router.get("/", authenticateToken, service.getEmployees.bind(service));
router.get("/:id", authenticateToken, service.getEmployee.bind(service));
router.post("/", authenticateToken, middleware.createEmployee.bind(middleware), service.createEmployee.bind(service));
router.patch("/:id", authenticateToken, middleware.updateEmployee.bind(middleware), service.updateEmployee.bind(service));
router.delete("/:id", authenticateToken, middleware.deleteEmployee.bind(middleware), service.deleteEmployee.bind(service));

export default router;
