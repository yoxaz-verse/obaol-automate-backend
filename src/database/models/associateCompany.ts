import mongoose from "mongoose";
import { normalizePhoneInput } from "../../utils/phone";
import { normalizeCapabilities } from "../../utils/companyCapabilities";

const AssociateCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: function (this: any) {
        return this.isExternalDirectoryListing !== true;
      },
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      required: function (this: any) {
        return this.isExternalDirectoryListing !== true;
      },
    },
    phoneCountryCode: { type: String, default: "+91" },
    phoneNational: { type: String, default: "" },
    geoType: { type: String, enum: ["INDIAN", "INTERNATIONAL"], default: "INDIAN" },
    country: { type: mongoose.Types.ObjectId, ref: "Country", required: false },
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
    gstin: { type: String, trim: true, uppercase: true },
    legalRegistrationNumber: { type: String, trim: true },
    legalComplianceInfo: { type: String, trim: true },
    phoneSecondary: {
      type: String,
      required: function (this: any) {
        return this.isExternalDirectoryListing !== true;
      },
    },
    phoneSecondaryCountryCode: { type: String, default: "+91" },
    phoneSecondaryNational: { type: String, default: "" },
    serviceCapabilities: [{ type: String, default: [] }],
    isQualityLabListed: { type: Boolean, default: false },
    labDisplayName: { type: String, trim: true, default: "" },
    labContactEmail: { type: String, trim: true, lowercase: true, default: "" },
    labContactPhone: { type: String, trim: true, default: "" },
    labContactPhoneSecondary: { type: String, trim: true, default: "" },
    labTests: [{ type: String, default: [] }],
    labCertifications: [{ type: String, default: [] }],
    labSpecifications: [{ type: String, default: [] }],
    labAcceptedItems: [{ type: String, default: [] }],
    labNotes: { type: String, default: "" },
    labListingState: {
      type: String,
      enum: ["DRAFT", "LIVE"],
      default: "LIVE",
      index: true,
    },
    labActivatedAt: { type: Date, default: null },
    labActivatedBy: { type: mongoose.Types.ObjectId, ref: "Admin", default: null },
    isExternalDirectoryListing: { type: Boolean, default: false, index: true },
    externalListingSource: {
      type: String,
      enum: ["SPICES_BOARD_QEL", "SPICES_BOARD_EMPANELLED", ""],
      default: "",
      index: true,
    },
    externalListingSourceUrl: { type: String, trim: true, default: "" },
    externalListingReference: { type: String, trim: true, default: "" },
    externalListingDate: { type: Date, default: null },
    companyFunctionPriorities: [{ type: mongoose.Types.ObjectId, ref: "CompanyFunction" }],
    assignedOperator: { type: mongoose.Schema.Types.ObjectId, ref: "Operator" },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "Associate" },
    slug: { type: String, unique: true, sparse: true, trim: true }, // For improved SEO & catalog URLs
    logo: { type: String },
    banner: { type: String },
    description: { type: String },
    aboutUs: { type: String },
    address: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      label: { type: String, trim: true },
    },
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
    registrationStatus: {
      type: String,
      enum: ["PENDING_REVIEW", "APPROVED", "REJECTED"],
      default: "PENDING_REVIEW",
    },
    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Types.ObjectId, ref: "Admin" },
    reviewNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AssociateCompanySchema.index({ isQualityLabListed: 1, labListingState: 1, isDeleted: 1 });
AssociateCompanySchema.index({ isExternalDirectoryListing: 1, externalListingSource: 1, externalListingReference: 1 });
AssociateCompanySchema.index({
  isQualityLabListed: 1,
  labListingState: 1,
  updatedAt: -1,
});

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const inferCapabilitiesFromCompanyTypeName = (name: string): string[] => {
  const n = String(name || "").toLowerCase();
  const all = new Set<string>();
  if (n.includes("logistics") || n.includes("transport")) all.add("TRANSPORTATION");
  if (n.includes("shipping") || n.includes("freight") || n.includes("forward")) all.add("SHIPPING");
  if (n.includes("pack")) all.add("PACKAGING");
  if (n.includes("quality") || n.includes("lab") || n.includes("test")) all.add("QUALITY_TESTING");
  if (n.includes("cert")) all.add("CERTIFICATION");
  if (n.includes("procure") || n.includes("sourc") || n.includes("trader") || n.includes("supplier")) all.add("PROCUREMENT");
  return Array.from(all);
};

// Automatic Subdomain & Slug Generation
AssociateCompanySchema.pre("save", async function (next) {
  const self = this as any;

  const normalizedPrimary = normalizePhoneInput({
    rawPhone: self.phone,
    rawCountryCode: self.phoneCountryCode,
    rawNational: self.phoneNational,
  });
  self.phone = normalizedPrimary.e164;
  self.phoneCountryCode = normalizedPrimary.countryCode;
  self.phoneNational = normalizedPrimary.national;

  const normalizedSecondary = normalizePhoneInput({
    rawPhone: self.phoneSecondary,
    rawCountryCode: self.phoneSecondaryCountryCode || self.phoneCountryCode,
    rawNational: self.phoneSecondaryNational,
    fallbackCountryCode: self.phoneCountryCode,
  });
  self.phoneSecondary = normalizedSecondary.e164;
  self.phoneSecondaryCountryCode = normalizedSecondary.countryCode;
  self.phoneSecondaryNational = normalizedSecondary.national;
  if (typeof self.gstin === "string") {
    self.gstin = self.gstin.trim().toUpperCase();
    if (self.gstin && !GST_REGEX.test(self.gstin)) {
      return next(new Error("Invalid GSTIN format."));
    }
  }

  if ((!Array.isArray(self.serviceCapabilities) || self.serviceCapabilities.length === 0) && self.companyType) {
    const companyTypeDoc = await mongoose.models.CompanyType.findById(self.companyType).select("name");
    const inferred = inferCapabilitiesFromCompanyTypeName(String(companyTypeDoc?.name || ""));
    if (inferred.length) self.serviceCapabilities = inferred;
  }
  self.serviceCapabilities = normalizeCapabilities(self.serviceCapabilities);

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

AssociateCompanySchema.pre("findOneAndUpdate", function (next) {
  const update: any = this.getUpdate() || {};
  const payload = update.$set ? update.$set : update;
  const hasPrimaryPhone =
    Object.prototype.hasOwnProperty.call(payload, "phone") ||
    Object.prototype.hasOwnProperty.call(payload, "phoneCountryCode") ||
    Object.prototype.hasOwnProperty.call(payload, "phoneNational");
  const hasSecondaryPhone =
    Object.prototype.hasOwnProperty.call(payload, "phoneSecondary") ||
    Object.prototype.hasOwnProperty.call(payload, "phoneSecondaryCountryCode") ||
    Object.prototype.hasOwnProperty.call(payload, "phoneSecondaryNational");

  if (hasPrimaryPhone) {
    const normalizedPrimary = normalizePhoneInput({
      rawPhone: payload.phone,
      rawCountryCode: payload.phoneCountryCode,
      rawNational: payload.phoneNational,
    });
    payload.phone = normalizedPrimary.e164;
    payload.phoneCountryCode = normalizedPrimary.countryCode;
    payload.phoneNational = normalizedPrimary.national;
  }
  if (hasSecondaryPhone) {
    const normalizedSecondary = normalizePhoneInput({
      rawPhone: payload.phoneSecondary,
      rawCountryCode: payload.phoneSecondaryCountryCode || payload.phoneCountryCode,
      rawNational: payload.phoneSecondaryNational,
      fallbackCountryCode: payload.phoneCountryCode || "+91",
    });
    payload.phoneSecondary = normalizedSecondary.e164;
    payload.phoneSecondaryCountryCode = normalizedSecondary.countryCode;
    payload.phoneSecondaryNational = normalizedSecondary.national;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "gstin")) {
    const gstin = String(payload.gstin || "").trim().toUpperCase();
    if (gstin && !GST_REGEX.test(gstin)) {
      return next(new Error("Invalid GSTIN format."));
    }
    payload.gstin = gstin || undefined;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "serviceCapabilities")) {
    payload.serviceCapabilities = normalizeCapabilities(payload.serviceCapabilities);
  }

  if (update.$set) {
    update.$set = payload;
    this.setUpdate(update);
  } else {
    this.setUpdate(payload);
  }
  next();
});

export const AssociateCompanyModel = mongoose.model(
  "AssociateCompany",
  AssociateCompanySchema
);
