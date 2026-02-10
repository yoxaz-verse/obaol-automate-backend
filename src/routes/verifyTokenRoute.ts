import authenticateToken from "../middlewares/auth";
import { Router } from "express";
import { VerificationModel } from "../database/models/verification";

const verifyTokenRoute = Router();

verifyTokenRoute.get("/", authenticateToken, async (req: any, res) => {
  // req.user is guaranteed by authenticateToken middleware

  // Fetch real verification status
  const verificationRecord = await VerificationModel.findOne({
    userId: req.user.id,
    userType: req.user.role,
    method: "email"
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      verified: {
        email: verificationRecord?.verified === true,
        phone: false, // phone/gst can be added later if needed
        gst: false
      }
    },
  });
});

export default verifyTokenRoute;
