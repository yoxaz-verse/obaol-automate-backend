import authenticateToken from "../middlewares/auth";
import { Router } from "express";
import { VerificationModel } from "../database/models/verification";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyInterestProfileModel } from "../database/models/companyInterestProfile";
import { normalizeCompanyInterests } from "../constants/companyInterests";

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

  if (roleLower === "associate") {
    const associate = await AssociateModel.findById(req.user.id).select("associateCompany").lean();
    associateCompanyId = associate?.associateCompany ? String(associate.associateCompany) : null;
  } else if (roleLower === "employee" || roleLower === "team") {
    const companies = await AssociateCompanyModel.find({ assignedEmployee: req.user.id }).select("_id").limit(2).lean();
    if (companies.length === 1) {
      associateCompanyId = String(companies[0]._id);
      companyInterestsConfigured = false;
    }
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

  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      associateCompanyId,
      companyInterestsConfigured,
      companyInterests,
      verified: {
        email: verificationRecord?.verified === true,
        phone: false, // phone/gst can be added later if needed
        gst: false
      }
    },
  });
});

export default verifyTokenRoute;
