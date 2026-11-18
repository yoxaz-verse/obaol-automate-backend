import { NextFunction, Request, Response } from "express";
import { workflowSignatureAvailability } from "../services/signatureAccessService";

export const requireActiveSignature = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const availability = await workflowSignatureAvailability(req);
    if (availability.available) return next();
    return res.status(409).json({
      success: false,
      code: "ACTIVE_SIGNATURE_REQUIRED",
      message: "Verify a personal or company signature before continuing this workflow.",
      context: { workflow: req.baseUrl.includes("inquir") ? "INQUIRY" : "ORDER", companyId: availability.companyId },
      signatureManagementUrl: "/dashboard/settings/signature-management",
      requestId: req.requestId,
    });
  } catch (error) { next(error); }
};
