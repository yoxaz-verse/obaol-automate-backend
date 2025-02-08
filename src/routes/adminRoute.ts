import { Router } from "express";
import AdminService from "../services/admin";
import AdminMiddleware from "../middlewares/admin";
import authorizeRoles from "../middlewares/roleMiddleware";
import authenticateToken from "../middlewares/auth";
import { validateUniqueEmail } from "../database/models/emailChecker";

const router = Router();
const adminService = new AdminService();
const adminMiddleware = new AdminMiddleware();

// // LOGIN an admin (Public route)
// router.post(
//   "/login",
//   // authorizeRoles("Admin"),
//   adminMiddleware.validateLogin.bind(adminMiddleware),
//   adminService.login.bind(adminService)
// );

router.get(
  "/user",
  authenticateToken,
  // authorizeRoles("Admin"),
  adminService.getCurrentUser.bind(adminService)
);

// GET all admins
router.get(
  "/",
  authenticateToken,
  // authorizeRoles("Admin"),
  adminService.getAdmins.bind(adminService)
);

// GET admin by ID
router.get(
  "/:id",
  authenticateToken,
  adminMiddleware.validateGet.bind(adminMiddleware),
  adminService.getAdmin.bind(adminService)
);

// CREATE a new admin
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  validateUniqueEmail,
  adminMiddleware.validateCreate.bind(adminMiddleware),
  adminService.createAdmin.bind(adminService)
);

// UPDATE an admin
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  adminMiddleware.validateUpdate.bind(adminMiddleware),
  adminService.updateAdmin.bind(adminService)
);

// DELETE an admin
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  adminMiddleware.validateDelete.bind(adminMiddleware),
  adminService.deleteAdmin.bind(adminService)
);

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export default router;
