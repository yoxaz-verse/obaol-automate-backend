import mongoose, { Schema } from "mongoose";

const AuditSchema = new Schema({ action: String, by: { type: Schema.Types.ObjectId, ref: "Associate" }, at: { type: Date, default: Date.now }, detail: Schema.Types.Mixed }, { _id: false });
const AttachmentSchema = new Schema({ kind: { type: String, enum: ["TRANSPORT_DOCUMENT", "EXCEPTION_EVIDENCE", "PROOF_OF_DELIVERY"], required: true }, name: { type: String, required: true, trim: true }, url: { type: String, required: true, trim: true }, storageName: { type: String, trim: true, default: "" }, mimeType: { type: String, trim: true, default: "" }, size: { type: Number, min: 0, default: 0 }, uploadedBy: { type: Schema.Types.ObjectId, ref: "Associate" }, uploadedAt: { type: Date, default: Date.now } });

const InlandTransportProfileSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
  displayName: { type: String, trim: true, default: "" }, summary: { type: String, trim: true, default: "" },
  serviceAreas: [{ type: String, trim: true }], routeCoverage: [{ from: String, to: String }],
  vehicleTypes: [{ type: String, trim: true }], cargoTypes: [{ type: String, trim: true }],
  contactName: { type: String, trim: true, default: "" }, contactEmail: { type: String, trim: true, default: "" }, contactPhone: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["DRAFT", "ACTIVE"], default: "DRAFT" }, updatedBy: { type: Schema.Types.ObjectId, ref: "Associate" },
}, { timestamps: true });

const InlandVehicleSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  registrationNumber: { type: String, required: true, trim: true, uppercase: true }, ownership: { type: String, enum: ["OWNED", "CONTRACTED"], required: true },
  vehicleType: { type: String, required: true, trim: true }, capacity: { type: Number, min: 0, default: 0 }, capacityUnit: { type: String, default: "MT" },
  carrierName: { type: String, trim: true, default: "" }, complianceExpiresAt: { type: Date, default: null },
  status: { type: String, enum: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "INACTIVE"], default: "AVAILABLE", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "Associate" }, updatedBy: { type: Schema.Types.ObjectId, ref: "Associate" },
}, { timestamps: true });
InlandVehicleSchema.index({ companyId: 1, registrationNumber: 1 }, { unique: true });

const InlandDriverSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, name: { type: String, required: true, trim: true }, phone: { type: String, required: true, trim: true },
  licenceNumber: { type: String, required: true, trim: true, uppercase: true }, licenceExpiresAt: { type: Date, default: null },
  status: { type: String, enum: ["AVAILABLE", "ASSIGNED", "INACTIVE"], default: "AVAILABLE", index: true }, createdBy: { type: Schema.Types.ObjectId, ref: "Associate" }, updatedBy: { type: Schema.Types.ObjectId, ref: "Associate" },
}, { timestamps: true });
InlandDriverSchema.index({ companyId: 1, licenceNumber: 1 }, { unique: true });

const InlandTripSchema = new Schema({
  reference: { type: String, required: true, unique: true, index: true }, companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  inquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null, index: true }, executionTaskId: { type: Schema.Types.ObjectId, default: null, index: true }, orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  segmentKey: { type: String, default: "default" }, segmentLabel: { type: String, default: "Inland transportation" }, origin: { type: String, default: "" }, destination: { type: String, default: "" }, cargoDescription: { type: String, default: "" },
  vehicleId: { type: Schema.Types.ObjectId, ref: "InlandVehicle", default: null }, driverId: { type: Schema.Types.ObjectId, ref: "InlandDriver", default: null },
  status: { type: String, enum: ["PLANNED", "DISPATCHED", "AT_PICKUP", "LOADING", "IN_TRANSIT", "DELIVERED", "COMPLETED", "EXCEPTION", "CANCELLED"], default: "PLANNED", index: true },
  scheduledPickupAt: { type: Date, default: null }, estimatedArrival: { type: Date, default: null }, currentLocation: { type: String, default: "" }, locationUpdatedAt: { type: Date, default: null },
  milestones: [{ status: String, note: String, location: String, at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: "Associate" } }],
  exceptions: [{ title: { type: String, required: true }, description: String, status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN" }, openedAt: { type: Date, default: Date.now }, resolvedAt: Date, createdBy: { type: Schema.Types.ObjectId, ref: "Associate" } }],
  attachments: [AttachmentSchema], audit: [AuditSchema], archivedAt: { type: Date, default: null },
}, { timestamps: true });
InlandTripSchema.index({ companyId: 1, executionTaskId: 1, segmentKey: 1 }, { unique: true, partialFilterExpression: { executionTaskId: { $type: "objectId" } } });

export const InlandTransportProfileModel = mongoose.model("InlandTransportProfile", InlandTransportProfileSchema);
export const InlandVehicleModel = mongoose.model("InlandVehicle", InlandVehicleSchema);
export const InlandDriverModel = mongoose.model("InlandDriver", InlandDriverSchema);
export const InlandTripModel = mongoose.model("InlandTrip", InlandTripSchema);
