import mongoose from "mongoose";

const ResearchedCompanySchema = new mongoose.Schema(
  {
    submittedBy: {
      type: mongoose.Types.ObjectId,
      ref: "Employee",
      required: false,
    }, // optional but useful
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    phoneSecondary: { type: String, required: false },

    // Relations
    state: { type: mongoose.Types.ObjectId, ref: "State" },
    district: { type: mongoose.Types.ObjectId, ref: "District" },
    division: { type: mongoose.Types.ObjectId, ref: "Division" },
    pincodeEntry: { type: mongoose.Types.ObjectId, ref: "PincodeEntry" },

    // Multiple references
    product: [{ type: mongoose.Types.ObjectId, ref: "Product" }],
    certification: [{ type: mongoose.Types.ObjectId, ref: "Certification" }],
    companyBusinessModel: [
      { type: mongoose.Types.ObjectId, ref: "CompanyBusinessModel" },
    ],
    companyIntent: [{ type: mongoose.Types.ObjectId, ref: "SubIntent" }],

    // Single references
    companyType: { type: mongoose.Types.ObjectId, ref: "CompanyType" },
    companyStage: { type: mongoose.Types.ObjectId, ref: "CompanyStage" },

    // Misc
    painPoints: { type: String, default: null },
    websiteLink: { type: String },

    isApproved: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    resubmitted: { type: Boolean, default: false },
    feedback: { type: String, required: true },

    assignedTo: {
      type: mongoose.Types.ObjectId,
      ref: "Employee",
      required: false,
    }, // optional but useful
  },
  { timestamps: true }
);

export const ResearchedCompanyModel = mongoose.model(
  "ResearchedCompany",
  ResearchedCompanySchema
);
