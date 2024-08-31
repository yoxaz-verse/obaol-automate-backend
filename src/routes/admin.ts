import { Router } from "express";
import AdminService from "../services/admin";
import AdminMiddleware from "../middlewares/admin";

const router = Router();
const adminService = new AdminService();
const adminMiddleware = new AdminMiddleware();

router.get(
  "/",
  adminMiddleware.validateSuperAdmin.bind(adminMiddleware),
  adminService.getAdmins.bind(adminService)
);

router.get(
  "/:id",
  adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware),
  adminMiddleware.getAdmin.bind(adminMiddleware),
  adminService.getAdmin.bind(adminService)
);

router.patch(
  "/:id",
  adminMiddleware.validateSuperAdmin.bind(adminMiddleware),
  adminMiddleware.updateAdmin.bind(adminMiddleware),
  adminService.updateAdmin.bind(adminService)
);

router.delete(
  "/:id",
  adminMiddleware.validateSuperAdmin.bind(adminMiddleware),
  adminMiddleware.deleteAdmin.bind(adminMiddleware),
  adminService.deleteAdmin.bind(adminService)
);

router.post(
  "/",
  adminMiddleware.validateSuperAdmin.bind(adminMiddleware),
  adminMiddleware.createAdmin.bind(adminMiddleware),
  adminService.createAdmin.bind(adminService)
);

router.post(
  "/login",
  adminMiddleware.adminLogin.bind(adminMiddleware),
  adminService.adminLogin.bind(adminService)
);

router.post(
  "/logout",
  adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware),
  adminService.adminLogout.bind(adminService)
);

router.post(
  "/refresh-token",
  adminMiddleware.refreshToken.bind(adminMiddleware),
  adminService.adminRefreshToken.bind(adminService)
);

export default router;
