import { Router } from "express";
import AdminService from "../services/admin";
import AdminMiddleware from "../middlewares/admin";

const router = Router();
const adminService = new AdminService();
const adminMiddleware = new AdminMiddleware();

router.get("/", adminService.getAdmins.bind(adminService));
router.get(
  "/:id",
  adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware),
  adminService.getAdmin.bind(adminService)
);
router.post(
  "/",
  adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware),
  adminService.createAdmin.bind(adminService)
);
router.put(
  "/:id",
  adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware),
  adminService.updateAdmin.bind(adminService)
);
router.delete(
  "/:id",
  adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware),
  adminService.deleteAdmin.bind(adminService)
);
router.post(
  "/login",
  adminMiddleware.adminLogin.bind(adminMiddleware),
  adminService.adminLogin.bind(adminService)
);
// router.post("/logout", adminMiddleware.validateAdminOrSuperAdmin.bind(adminMiddleware), adminService.adminLogout.bind(adminService));
// router.post("/refresh-token", adminMiddleware.refreshToken.bind(adminMiddleware), adminService.adminRefreshToken.bind(adminService));

export default router;
