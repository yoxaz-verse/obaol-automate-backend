import mongoose, { Schema } from "mongoose";
import { SERVICE_DEPARTMENTS, SERVICE_PROFILE_STATUSES } from "../../interfaces/serviceMarketplace";

const CredentialSchema = new Schema({
  certificationId: { type: Schema.Types.ObjectId, ref: "ServiceTaxonomy", required: true }, issuer: { type: String, required: true, trim: true },
  credentialNumber: { type: String, default: "", trim: true }, validFrom: Date, validTo: Date, documentUrl: { type: String, default: "", trim: true },
  verificationStatus: { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING" }, reviewNotes: { type: String, default: "", trim: true },
}, { _id: true });
const CapabilitySchema = new Schema({
  name: { type: String, required: true, trim: true }, serviceIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }],
  formatIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }], materialIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }],
  commodityIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }], machineryIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }],
  qualityOptionIds: [{ type: Schema.Types.ObjectId, ref: "ServiceTaxonomy" }], credentialIds: [{ type: Schema.Types.ObjectId }],
  minimumQuantity: { type: Number, min: 0, default: 0 }, capacityPerDay: { type: Number, min: 0, default: 0 }, quantityUnit: { type: String, enum: ["KG", "MT", "Quintal", "UNIT"], default: "MT" },
  turnaroundDays: { type: Number, min: 0, default: 0 }, notes: { type: String, default: "", trim: true },
}, { _id: true });
const LocationSchema = new Schema({
  name: { type: String, required: true, trim: true }, address: { type: String, required: true, trim: true }, country: { type: String, required: true, trim: true },
  state: { type: String, default: "", trim: true }, city: { type: String, default: "", trim: true }, latitude: Number, longitude: Number,
  coverageCountries: [{ type: String, trim: true }], coverageStates: [{ type: String, trim: true }],
}, { _id: true });
const SnapshotSchema = new Schema({
  displayName: { type: String, required: true, trim: true }, summary: { type: String, default: "", trim: true },
  contactEmail: { type: String, required: true, trim: true, lowercase: true }, contactPhone: { type: String, required: true, trim: true }, whatsappPhone: { type: String, default: "", trim: true },
  website: { type: String, default: "", trim: true }, imageUrls: [{ type: String, trim: true }], locations: { type: [LocationSchema], default: [] },
  credentials: { type: [CredentialSchema], default: [] }, capabilities: { type: [CapabilitySchema], default: [] },
}, { _id: false });
const ServiceProviderProfileSchema = new Schema({
  department: { type: String, enum: SERVICE_DEPARTMENTS, required: true, index: true }, companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  draft: { type: SnapshotSchema, default: null }, published: { type: SnapshotSchema, default: null },
  status: { type: String, enum: SERVICE_PROFILE_STATUSES, default: "DRAFT", index: true }, reviewNotes: { type: String, default: "", trim: true },
  submittedAt: Date, publishedAt: Date, reviewedBy: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true });
ServiceProviderProfileSchema.index({ department: 1, companyId: 1 }, { unique: true });
ServiceProviderProfileSchema.index({ department: 1, status: 1, "published.displayName": 1 });
export const ServiceProviderProfileModel = mongoose.model("ServiceProviderProfile", ServiceProviderProfileSchema);
