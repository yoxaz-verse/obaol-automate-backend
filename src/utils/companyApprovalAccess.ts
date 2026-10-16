import { Request, Response, NextFunction } from "express";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";

export type CompanyApprovalStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type CompanyApprovalAccess = {
  companyId: string | null;
  companyName: string | null;
  status: CompanyApprovalStatus;
  isApproved: boolean;
  actionsAllowed: boolean;
  reviewReason: string | null;
};

const normalizeStatus = (value: unknown): CompanyApprovalStatus => {
  const status = String(value || "PENDING_REVIEW").toUpperCase();
  if (status === "APPROVED" || status === "REJECTED") return status;
  return "PENDING_REVIEW";
};

export async function resolveAssociateCompanyApproval(associateId: string): Promise<CompanyApprovalAccess> {
  const associate: any = await AssociateModel.findById(associateId)
    .select("associateCompany")
    .lean();
  const companyId = associate?.associateCompany ? String(associate.associateCompany) : null;
  const company: any = companyId
    ? await AssociateCompanyModel.findById(companyId)
      .select("name registrationStatus isApproved isDeleted reviewNotes")
      .lean()
    : null;
  const status = normalizeStatus(company?.registrationStatus);
  const isApproved = Boolean(
    company &&
    company.isDeleted !== true &&
    company.isApproved === true &&
    status === "APPROVED"
  );

  return {
    companyId,
    companyName: company?.name ? String(company.name) : null,
    status,
    isApproved,
    actionsAllowed: isApproved,
    reviewReason: company?.reviewNotes ? String(company.reviewNotes) : null,
  };
}

const isReadRequest = (method: string) => method === "GET" || method === "HEAD" || method === "OPTIONS";

const isAllowedRestrictedMutation = (req: Request, associateId: string) => {
  const path = String(req.originalUrl || req.url || "").split("?")[0];
  if (/\/auth\/(logout|password|sessions|passkeys)(\/|$)/.test(path)) return true;
  if (/\/auth\/onboarding$/.test(path)) return true;
  if (/\/verification\//.test(path)) return true;
  if (/\/presence\/ping$/.test(path)) return true;
  if (/\/notifications\/(mark-section-read|read-all|[^/]+\/read)$/.test(path)) return true;
  if (/\/support\/(conversations|availability)/.test(path)) return true;
  if (/\/associates\/onboarding\/tutorial$/.test(path)) return true;
  return new RegExp(`/associates/${associateId}$`).test(path) && ["PATCH", "PUT"].includes(req.method);
};

export async function requireApprovedAssociateCompany(req: Request, res: Response, next: NextFunction) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "associate" || isReadRequest(req.method) || isAllowedRestrictedMutation(req, String(req.user?.id || ""))) {
    return next();
  }

  try {
    const associate: any = await AssociateModel.findById(String(req.user?.id || ""))
      .select("registrationStatus")
      .lean();
    if (String(associate?.registrationStatus || "PENDING_REVIEW").toUpperCase() !== "APPROVED") {
      return next();
    }
    const companyApproval = await resolveAssociateCompanyApproval(String(req.user?.id || ""));
    if (companyApproval.actionsAllowed) return next();
    return res.status(403).json({
      success: false,
      code: "COMPANY_APPROVAL_REQUIRED",
      message: companyApproval.companyId
        ? "Your company is not accepted yet. You can browse the platform, but business actions are disabled until approval."
        : "Link an accepted company before performing business actions.",
      companyApproval,
    });
  } catch (error) {
    return next(error);
  }
}
