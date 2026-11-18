import mongoose, { Schema } from "mongoose";

const AuditSchema = new Schema({ action: String, by: { type: Schema.Types.ObjectId, ref: "Associate" }, at: { type: Date, default: Date.now }, detail: Schema.Types.Mixed }, { _id: false });
const RoutePointSchema = new Schema({ slotId: { type: String, required: true, trim: true }, role: { type: String, enum: ["ORIGIN", "WAYPOINT", "DESTINATION"], required: true }, order: { type: Number, required: true, min: 0 }, location: { latitude: { type: Number, required: true, min: -90, max: 90 }, longitude: { type: Number, required: true, min: -180, max: 180 }, label: { type: String, required: true, trim: true }, address: { type: String, trim: true, default: "" }, city: { type: String, trim: true, default: "" }, district: { type: String, trim: true, default: "" }, state: { type: String, trim: true, default: "" }, country: { type: String, trim: true, default: "" }, countryCode: { type: String, trim: true, uppercase: true, default: "" }, postalCode: { type: String, trim: true, default: "" } } }, { _id: false });
const AttachmentSchema = new Schema({ kind: { type: String, enum: ["TRANSPORT_DOCUMENT", "EXCEPTION_EVIDENCE", "PROOF_OF_DELIVERY"], required: true }, name: { type: String, required: true, trim: true }, url: { type: String, required: true, trim: true }, storageName: { type: String, trim: true, default: "" }, objectKey: { type: String, trim: true, default: "" }, checksum: { type: String, trim: true, default: "" }, storageProvider: { type: String, enum: ["s3", "local"], default: "local" }, mimeType: { type: String, trim: true, default: "" }, size: { type: Number, min: 0, default: 0 }, uploadedBy: { type: Schema.Types.ObjectId, ref: "Associate" }, uploadedAt: { type: Date, default: Date.now } });

const InlandTransportProfileSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
  displayName: { type: String, trim: true, default: "" }, summary: { type: String, trim: true, default: "" },
  serviceAreas: [{ type: String, trim: true }], routeCoverage: [{ from: String, to: String }],
  vehicleTypes: [{ type: String, trim: true }], cargoTypes: [{ type: String, trim: true }],
  contactName: { type: String, trim: true, default: "" }, contactEmail: { type: String, trim: true, default: "" }, contactPhone: { type: String, trim: true, default: "" }, contactWhatsapp: { type: String, trim: true, default: "" }, website: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["DRAFT", "ACTIVE"], default: "DRAFT" }, updatedBy: { type: Schema.Types.ObjectId, ref: "Associate" },
}, { timestamps: true });

const InlandVehicleSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  registrationNumber: { type: String, required: true, trim: true, uppercase: true }, ownership: { type: String, enum: ["OWNED", "CONTRACTED"], required: true },
  vehicleType: { type: String, required: true, trim: true }, capacity: { type: Number, min: 0, default: 0 }, capacityUnit: { type: String, default: "MT" },
  publicAlias: { type: String, trim: true, default: "" }, manufacturer: { type: String, trim: true, default: "" }, model: { type: String, trim: true, default: "" }, modelYear: { type: Number, min: 1900, max: 2200, default: null },
  bodyType: { type: String, trim: true, default: "" }, axleConfiguration: { type: String, trim: true, default: "" }, fuelType: { type: String, trim: true, default: "" }, supportedCargo: [{ type: String, trim: true }], imageUrls: [{ type: String, trim: true }],
  baseLocation: { label: { type: String, default: "" }, address: { type: String, default: "" }, city: { type: String, default: "" }, district: { type: String, default: "" }, state: { type: String, default: "" }, country: { type: String, default: "India" }, postalCode: { type: String, default: "" }, latitude: Number, longitude: Number },
  carrierName: { type: String, trim: true, default: "" }, complianceExpiresAt: { type: Date, default: null },
  compliance: { insuranceExpiresAt: Date, permitExpiresAt: Date, fitnessExpiresAt: Date, pollutionExpiresAt: Date },
  publiclyListed: { type: Boolean, default: false, index: true },
  latestPosition: { latitude: Number, longitude: Number, accuracyMeters: Number, source: { type: String, enum: ["MANUAL", "APP", "TRIP", "GPS"], default: "MANUAL" }, recordedAt: Date, tripId: { type: Schema.Types.ObjectId, ref: "InlandTrip", default: null } },
  status: { type: String, enum: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "INACTIVE"], default: "AVAILABLE", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "Associate" }, updatedBy: { type: Schema.Types.ObjectId, ref: "Associate" },
}, { timestamps: true });
InlandVehicleSchema.index({ companyId: 1, registrationNumber: 1 }, { unique: true });
InlandVehicleSchema.index({ publiclyListed: 1, status: 1, "latestPosition.recordedAt": -1 });
InlandVehicleSchema.index({ manufacturer: 1, model: 1, bodyType: 1, capacity: 1 });

const InlandVehicleLocationSchema = new Schema({
  vehicleId: { type: Schema.Types.ObjectId, ref: "InlandVehicle", required: true, index: true }, companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, tripId: { type: Schema.Types.ObjectId, ref: "InlandTrip", default: null, index: true },
  latitude: { type: Number, required: true, min: -90, max: 90 }, longitude: { type: Number, required: true, min: -180, max: 180 }, accuracyMeters: { type: Number, min: 0, default: null }, source: { type: String, enum: ["MANUAL", "APP", "TRIP", "GPS"], required: true }, recordedAt: { type: Date, default: Date.now }, createdBy: Schema.Types.ObjectId,
}, { timestamps: true });
InlandVehicleLocationSchema.index({ vehicleId: 1, recordedAt: -1 });
InlandVehicleLocationSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
const InlandTransportContactEventSchema = new Schema({ companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, vehicleId: { type: Schema.Types.ObjectId, ref: "InlandVehicle", default: null, index: true }, actorId: Schema.Types.ObjectId, channel: { type: String, enum: ["PHONE", "EMAIL", "WHATSAPP", "WEBSITE"], required: true } }, { timestamps: true });

const InlandDriverSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, name: { type: String, required: true, trim: true }, phone: { type: String, required: true, trim: true },
  licenceNumber: { type: String, required: true, trim: true, uppercase: true }, licenceExpiresAt: { type: Date, default: null },
  status: { type: String, enum: ["AVAILABLE", "ASSIGNED", "INACTIVE"], default: "AVAILABLE", index: true }, createdBy: { type: Schema.Types.ObjectId, ref: "Associate" }, updatedBy: { type: Schema.Types.ObjectId, ref: "Associate" },
}, { timestamps: true });
InlandDriverSchema.index({ companyId: 1, licenceNumber: 1 }, { unique: true });

const InlandTripSchema = new Schema({
  reference: { type: String, required: true, unique: true, index: true }, companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  inquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null, index: true }, executionTaskId: { type: Schema.Types.ObjectId, default: null, index: true }, orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  segmentKey: { type: String, default: "default" }, segmentLabel: { type: String, default: "Inland transportation" }, origin: { type: String, default: "" }, destination: { type: String, default: "" }, routePoints: { type: [RoutePointSchema], default: [] }, cargoDescription: { type: String, default: "" },
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
export const InlandVehicleLocationModel = mongoose.model("InlandVehicleLocation", InlandVehicleLocationSchema);
export const InlandTransportContactEventModel = mongoose.model("InlandTransportContactEvent", InlandTransportContactEventSchema);
export const InlandDriverModel = mongoose.model("InlandDriver", InlandDriverSchema);
export const InlandTripModel = mongoose.model("InlandTrip", InlandTripSchema);
