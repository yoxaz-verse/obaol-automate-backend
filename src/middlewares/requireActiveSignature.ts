import { NextFunction, Request, Response } from "express";
import { workflowSignatureAvailability } from "../services/signatureAccessService";

export const requireActiveSignature = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const availability = await workflowSignatureAvailability(req);
    if (availability.available) return next();
    const pendingVerification = availability.state === "PENDING_VERIFICATION";
    return res.status(409).json({
      success: false,
      code: "ACTIVE_SIGNATURE_REQUIRED",
      message: pendingVerification
        ? "Your signature is uploaded but still pending verification. Verify it before continuing this workflow."
        : "Register and verify a personal or company signature before continuing this workflow.",
      signatureState: availability.state,
      signatureOwnerType: availability.signature?.ownerType || null,
      context: { workflow: req.baseUrl.includes("inquir") ? "INQUIRY" : "ORDER", companyId: availability.companyId },
      signatureManagementUrl: "/dashboard/settings/signature-management",
      requestId: req.requestId,
    });
  } catch (error) { next(error); }
};
