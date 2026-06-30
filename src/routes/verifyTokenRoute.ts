import authenticateToken from "../middlewares/auth";
import { Router } from "express";
import { VerificationModel } from "../database/models/verification";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyInterestProfileModel } from "../database/models/companyInterestProfile";
import { normalizeCompanyInterests } from "../constants/companyInterests";
import { OperatorModel } from "../database/models/operator";

const verifyTokenRoute = Router();

verifyTokenRoute.get("/", authenticateToken, async (req: any, res) => {
  // req.user is guaranteed by authenticateToken middleware

  // Fetch real verification status
  const verificationRecord = await VerificationModel.findOne({
    userId: req.user.id,
    userType: req.user.role,
    method: "email"
  }).sort({ createdAt: -1 });

  const roleLower = String(req.user.role || "").toLowerCase();
  let associateCompanyId: string | null = null;
  let companyInterests: string[] = [];
  let companyInterestsConfigured = true;
  let dashboardTutorialStatus: string | null = null;
  let onboardingComplete = false;
  let registrationStatus: string | null = null;
  let rejectionReason: string | null = null;
  let pendingSince: Date | null = null;
  let associate: any = null;
  let operator: any = null;

  if (roleLower === "associate") {
    associate = await AssociateModel.findById(req.user.id)
      .select("name email phone associateCompany tradeMode dashboardTutorialStatus onboardingComplete registrationStatus reviewNotes approvalRequestedAt createdAt")
      .lean();
    associateCompanyId = associate?.associateCompany ? String(associate.associateCompany) : null;
    dashboardTutorialStatus = associate?.dashboardTutorialStatus || "PENDING";
    onboardingComplete = Boolean(associate?.onboardingComplete);
    registrationStatus = associate?.registrationStatus ? String(associate.registrationStatus) : null;
    rejectionReason = associate?.reviewNotes ? String(associate.reviewNotes) : null;
    pendingSince = associate?.approvalRequestedAt || associate?.createdAt || null;
  } else if (roleLower === "operator" || roleLower === "team") {
    const companies = await AssociateCompanyModel.find({ assignedOperator: req.user.id }).select("_id").limit(2).lean();
    if (companies.length === 1) {
      associateCompanyId = String(companies[0]._id);
      companyInterestsConfigured = false;
    }
    operator = await OperatorModel.findById(req.user.id).select("name email phone onboardingComplete registrationStatus reviewNotes approvalRequestedAt createdAt").lean();
    onboardingComplete = Boolean(operator?.onboardingComplete);
    registrationStatus = operator?.registrationStatus ? String(operator.registrationStatus) : null;
    rejectionReason = operator?.reviewNotes ? String(operator.reviewNotes) : null;
    pendingSince = operator?.approvalRequestedAt || operator?.createdAt || null;
  }

  if (associateCompanyId) {
    const [profile, company] = await Promise.all([
      CompanyInterestProfileModel.findOne({ associateCompanyId }).select("interests isConfigured").lean(),
      AssociateCompanyModel.findById(associateCompanyId).select("serviceCapabilities").lean(),
    ]);
    companyInterests = normalizeCompanyInterests(
      profile?.interests?.length ? profile.interests : company?.serviceCapabilities
    );
    companyInterestsConfigured = companyInterests.length > 0;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: associate?.email || operator?.email || req.user.email,
      name: associate?.name || operator?.name || req.user.name,
      phone: associate?.phone || operator?.phone || null,
      role: req.user.role,
      associateCompanyId,
      companyInterestsConfigured,
      companyInterests,
      tradeMode: roleLower === "associate" ? (associate?.tradeMode || "BOTH") : undefined,
      dashboardTutorialStatus,
      onboardingComplete,
      registrationStatus,
      rejectionReason,
      pendingSince,
      verified: {
        email: verificationRecord?.verified === true,
        phone: false, // phone/gst can be added later if needed
        gst: false
      }
    },
  });
});

export default verifyTokenRoute;
