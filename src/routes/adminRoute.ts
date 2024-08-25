import { Router } from "express";
import AdminService from "../services/admin";
import AdminMiddleware from "../middlewares/admin";

const router = Router();
const adminService = new AdminService();
const adminMiddleware = new AdminMiddleware();

router.get(
  "/",
  adminMiddleware.getAdmin.bind(adminMiddleware),
  adminService.getAdmins.bind(adminService)


);
router.get(
  "/:id",
  adminMiddleware.getAdmin.bind(adminMiddleware),
  adminService.getAdmin.bind(adminService)
);
router.post(
  "/",
  adminMiddleware.createAdmin.bind(adminMiddleware),
  adminService.createAdmin.bind(adminService)
);
router.put(
  "/:id",
  adminMiddleware.updateAdmin.bind(adminMiddleware),
  adminService.updateAdmin.bind(adminService)
);
router.delete(
  "/:id",
  adminMiddleware.deleteAdmin.bind(adminMiddleware),
  adminService.deleteAdmin.bind(adminService)
);

export default router;
