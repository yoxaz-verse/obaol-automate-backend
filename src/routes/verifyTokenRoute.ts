import authenticateToken from "../middlewares/auth";
import { Router } from "express";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { normalizeCompanyFunctionSlugs } from "../utils/companyCapabilities";
import { OperatorModel } from "../database/models/operator";
import { CustomerSupportAgentModel } from "../database/models/customerSupportAgent";
import { CompanyApprovalAccess, resolveAssociateCompanyApproval } from "../utils/companyApprovalAccess";
import { accountVerificationStatus } from "../utils/accountVerification";
import { AdminModel } from "../database/models/admin";

const verifyTokenRoute = Router();

verifyTokenRoute.get("/", authenticateToken, async (req: any, res) => {
  // req.user is guaranteed by authenticateToken middleware

  const roleLower = String(req.user.role || "").toLowerCase();
  let associateCompanyId: string | null = null;
  let providedCapabilities: string[] = [];
  let soughtCapabilities: string[] = [];
  let providedCapabilityPriorities: string[] = [];
  let soughtCapabilityPriorities: string[] = [];
  let companyCapabilitiesConfigured = true;
  let dashboardTutorialStatus: string | null = null;
  let onboardingComplete = false;
  let registrationStatus: string | null = null;
  let rejectionReason: string | null = null;
  let pendingSince: Date | null = null;
  let associate: any = null;
  let operator: any = null;
  let supportAgent: any = null;
  let admin: any = null;
  let companyApproval: CompanyApprovalAccess | null = null;

  if (roleLower === "associate" || roleLower === "customer") {
    associate = await AssociateModel.findById(req.user.id)
      .select("name email phone profilePicture isEmailVerified isPhoneVerified associateCompany dashboardTutorialStatus onboardingComplete registrationStatus reviewNotes approvalRequestedAt createdAt")
      .lean();
    associateCompanyId = associate?.associateCompany ? String(associate.associateCompany) : null;
    dashboardTutorialStatus = associate?.dashboardTutorialStatus || "PENDING";
    onboardingComplete = Boolean(associate?.onboardingComplete);
    registrationStatus = associate?.registrationStatus ? String(associate.registrationStatus) : null;
    rejectionReason = associate?.reviewNotes ? String(associate.reviewNotes) : null;
    pendingSince = associate?.approvalRequestedAt || associate?.createdAt || null;
    companyApproval = await resolveAssociateCompanyApproval(String(req.user.id));
  } else if (roleLower === "operator" || roleLower === "team") {
    const companies = await AssociateCompanyModel.find({ assignedOperator: req.user.id }).select("_id").limit(2).lean();
    if (companies.length === 1) {
      associateCompanyId = String(companies[0]._id);
      companyCapabilitiesConfigured = false;
    }
    operator = await OperatorModel.findById(req.user.id).select("name email phone profilePicture isEmailVerified isPhoneVerified onboardingComplete registrationStatus reviewNotes approvalRequestedAt createdAt").lean();
    onboardingComplete = Boolean(operator?.onboardingComplete);
    registrationStatus = operator?.registrationStatus ? String(operator.registrationStatus) : null;
    rejectionReason = operator?.reviewNotes ? String(operator.reviewNotes) : null;
    pendingSince = operator?.approvalRequestedAt || operator?.createdAt || null;
  } else if (roleLower === "customersupport" || roleLower === "customer-support") {
    supportAgent = await CustomerSupportAgentModel.findById(req.user.id)
      .select("name email phone isActive isAvailable lastSeenAt")
      .lean();
  } else if (roleLower === "admin") {
    admin = await AdminModel.findById(req.user.id).select("name email profilePicture").lean();
  }

  if (associateCompanyId) {
    const company = await AssociateCompanyModel.findById(associateCompanyId)
      .select("providedCapabilities soughtCapabilities providedCapabilityPriorities soughtCapabilityPriorities")
      .lean();
    providedCapabilities = normalizeCompanyFunctionSlugs((company as any)?.providedCapabilities);
    soughtCapabilities = normalizeCompanyFunctionSlugs((company as any)?.soughtCapabilities, "sought");
    providedCapabilityPriorities = ((company as any)?.providedCapabilityPriorities || []).map(String);
    soughtCapabilityPriorities = ((company as any)?.soughtCapabilityPriorities || []).map(String);
    companyCapabilitiesConfigured = providedCapabilities.length > 0 && soughtCapabilities.length > 0;
  }

  const verification = accountVerificationStatus(associate || operator || {}, roleLower);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: associate?.email || operator?.email || supportAgent?.email || admin?.email || req.user.email,
      name: associate?.name || operator?.name || supportAgent?.name || admin?.name || req.user.name,
      phone: associate?.phone || operator?.phone || supportAgent?.phone || null,
      role: req.user.role,
      profilePictureUrl: (associate?.profilePicture?.objectKey || operator?.profilePicture?.objectKey || admin?.profilePicture?.objectKey)
        ? `/v1/web/profile-pictures/${roleLower === "team" ? "operator" : roleLower === "customer" ? "associate" : roleLower}/${req.user.id}?v=${new Date(associate?.profilePicture?.updatedAt || operator?.profilePicture?.updatedAt || admin?.profilePicture?.updatedAt || 0).getTime()}`
        : null,
      isAvailable: supportAgent?.isAvailable ?? undefined,
      associateCompanyId,
      companyCapabilitiesConfigured,
      providedCapabilities,
      soughtCapabilities,
      providedCapabilityPriorities,
      soughtCapabilityPriorities,
      dashboardTutorialStatus,
      onboardingComplete,
      registrationStatus,
      rejectionReason,
      pendingSince,
      companyApproval,
      isEmailVerified: verification.emailVerified,
      isPhoneVerified: verification.phoneVerified,
      fullyVerified: verification.fullyVerified,
      verificationGraceEndsAt: verification.verificationGraceEndsAt,
      verificationRequired: verification.verificationRequired,
      verification,
      verified: {
        email: verification.emailVerified,
        phone: verification.phoneVerified,
        gst: false
      }
    },
  });
});

export default verifyTokenRoute;
