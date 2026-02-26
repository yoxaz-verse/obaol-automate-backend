import mongoose from "mongoose";

const AssociateCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    state: { type: mongoose.Types.ObjectId, ref: "State" },
    district: { type: mongoose.Types.ObjectId, ref: "District" },
    companyType: { type: mongoose.Types.ObjectId, ref: "CompanyType" },
    division: {
      type: mongoose.Types.ObjectId,
      ref: "Division",
      required: false,
    },
    pincodeEntry: {
      type: mongoose.Types.ObjectId,
      ref: "PincodeEntry",
      required: false,
    },
    phoneSecondary: { type: String, required: true },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "Associate" },
    slug: { type: String, unique: true, sparse: true, trim: true }, // For improved SEO & catalog URLs
    logo: { type: String },
    banner: { type: String },
    description: { type: String },
    aboutUs: { type: String },
    address: { type: String },
    website: { type: String },
    socialLinks: {
      linkedin: { type: String },
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
    },
    tags: [{ type: String }],
    subdomain: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    customDomain: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    isWebsiteLive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Automatic Subdomain & Slug Generation
AssociateCompanySchema.pre("save", async function (next) {
  const self = this as any;
  if (!self.subdomain || !self.slug) {
    const baseValue = self.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const generateUnique = async (field: string, base: string) => {
      let uniqueVal = base;
      let counter = 1;
      while (true) {
        const existing = await mongoose.models.AssociateCompany.findOne({
          [field]: uniqueVal,
          _id: { $ne: self._id }
        });
        if (!existing) break;
        uniqueVal = `${base}-${counter++}`;
      }
      return uniqueVal;
    };

    if (!self.subdomain) {
      self.subdomain = await generateUnique("subdomain", baseValue);
    }
    if (!self.slug) {
      self.slug = await generateUnique("slug", baseValue);
    }
  }
  next();
});

export const AssociateCompanyModel = mongoose.model(
  "AssociateCompany",
  AssociateCompanySchema
);
