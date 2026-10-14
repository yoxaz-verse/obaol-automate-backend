import mongoose, { Schema } from "mongoose";

const CredentialSchema = new Schema(
  {
    accreditationId: { type: Schema.Types.ObjectId, ref: "LabTaxonomy", required: true },
    issuer: { type: String, required: true, trim: true },
    credentialNumber: { type: String, default: "", trim: true },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    documentUrl: { type: String, default: "", trim: true },
    verificationStatus: { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING" },
    reviewNotes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const ProductCapabilityTemplateSchema = new Schema(
  {
    name: { type: String, default: "", trim: true },
    commodityId: { type: Schema.Types.ObjectId, ref: "LabTaxonomy", required: true },
    qualityClassifications: [{ type: String, enum: ["ORGANIC", "CONVENTIONAL", "IPM"] }],
    testIds: [{ type: Schema.Types.ObjectId, ref: "LabTaxonomy" }],
    parameterIds: [{ type: Schema.Types.ObjectId, ref: "LabTaxonomy" }],
    credentialIds: [{ type: Schema.Types.ObjectId }],
    method: { type: String, default: "", trim: true },
    turnaroundDays: { type: Number, min: 0, default: null },
    sampleRequirements: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const CountryAssignmentSchema = new Schema(
  {
    countryId: { type: Schema.Types.ObjectId, ref: "Country", required: true },
    productTemplateIds: [{ type: Schema.Types.ObjectId, required: true }],
  },
  { _id: true }
);

// Temporary compatibility shape accepted while older clients and records migrate.
const OfferingSchema = new Schema({
  commodityId: { type: Schema.Types.ObjectId, ref: "LabTaxonomy" },
  qualityClassifications: [{ type: String }],
  testId: { type: Schema.Types.ObjectId, ref: "LabTaxonomy" },
  parameterIds: [{ type: Schema.Types.ObjectId, ref: "LabTaxonomy" }],
  destinationCountryIds: [{ type: Schema.Types.ObjectId, ref: "Country" }],
  credentialIds: [{ type: Schema.Types.ObjectId }],
  method: String,
  turnaroundDays: Number,
  sampleRequirements: String,
  notes: String,
}, { _id: true });

const SnapshotSchema = new Schema(
  {
    displayName: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, required: true, trim: true },
    contactPhoneSecondary: { type: String, default: "", trim: true },
    address: { type: String, required: true, trim: true },
    physicalCountryId: { type: Schema.Types.ObjectId, ref: "Country", required: true },
    state: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      label: { type: String, trim: true },
      point: {
        type: { type: String, enum: ["Point"] },
        coordinates: [{ type: Number }],
      },
    },
    summary: { type: String, default: "", trim: true },
    credentials: { type: [CredentialSchema], default: [] },
    productCapabilityTemplates: { type: [ProductCapabilityTemplateSchema], default: [] },
    countryAssignments: { type: [CountryAssignmentSchema], default: [] },
    offerings: { type: [OfferingSchema], default: [] },
    legacyCapabilities: {
      tests: [{ type: String }],
      certifications: [{ type: String }],
      specifications: [{ type: String }],
      acceptedItems: [{ type: String }],
      requiresMapping: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const LabProfileSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
    draft: { type: SnapshotSchema, default: null },
    published: { type: SnapshotSchema, default: null },
    status: { type: String, enum: ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"], default: "DRAFT", index: true },
    reviewNotes: { type: String, default: "", trim: true },
    submittedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true }
);

LabProfileSchema.index({ "published.countryAssignments.countryId": 1, "published.countryAssignments.productTemplateIds": 1 });
LabProfileSchema.index({ "published.productCapabilityTemplates.commodityId": 1, "published.productCapabilityTemplates.testIds": 1 });
LabProfileSchema.index({ "published.productCapabilityTemplates.parameterIds": 1, "published.productCapabilityTemplates.qualityClassifications": 1 });
LabProfileSchema.index({ "published.credentials.accreditationId": 1, "published.credentials.verificationStatus": 1 });
LabProfileSchema.index({ "published.displayName": "text", "published.address": "text", "published.city": "text", "published.state": "text" });
LabProfileSchema.index({ "published.location.point": "2dsphere" }, { sparse: true });

export const LabProfileModel = mongoose.model("LabProfile", LabProfileSchema);

