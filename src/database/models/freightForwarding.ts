import mongoose, { Schema } from "mongoose";
import { CUSTOMS_STATUSES, FINANCE_KINDS, FREIGHT_MODES, FREIGHT_OFFER_STATUSES, FREIGHT_PROFILE_STATUSES, FREIGHT_REQUIREMENT_STATUSES, FREIGHT_SHIPMENT_STATUSES, FREIGHT_SOURCES, FREIGHT_WORKFLOWS } from "../../interfaces/freightForwarding";

const audit = new Schema({ action: String, at: { type: Date, default: Date.now }, by: Schema.Types.ObjectId, detail: Schema.Types.Mixed }, { _id: true });
const location = new Schema({ name: String, code: String, type: { type: String, enum: ["PORT", "AIRPORT", "RAIL_TERMINAL", "WAREHOUSE", "ADDRESS"] }, country: String, state: String, city: String }, { _id: false });
const party = new Schema({ role: { type: String, required: true }, companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany" }, name: String, email: String, phone: String, address: String, taxId: String }, { _id: true });
const milestone = new Schema({ code: String, label: String, status: { type: String, enum: ["PENDING", "COMPLETED", "DELAYED", "SKIPPED"], default: "PENDING" }, plannedAt: Date, estimatedAt: Date, actualAt: Date, delayReason: String, note: String, updatedBy: Schema.Types.ObjectId }, { _id: true });
const document = new Schema({ kind: String, name: String, url: String, version: { type: Number, default: 1 }, status: { type: String, enum: ["DRAFT", "ISSUED", "APPROVED", "REJECTED"], default: "DRAFT" }, expiresAt: Date, sharedWithCustomer: { type: Boolean, default: false }, uploadedBy: Schema.Types.ObjectId, uploadedAt: { type: Date, default: Date.now } }, { _id: true });

const FreightProviderProfileSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, unique: true, index: true },
  status: { type: String, enum: FREIGHT_PROFILE_STATUSES, default: "DRAFT", index: true }, draft: Schema.Types.Mixed, published: Schema.Types.Mixed,
  revisions: [{ snapshot: Schema.Types.Mixed, at: { type: Date, default: Date.now }, by: Schema.Types.ObjectId }], reviewNotes: String, submittedAt: Date, publishedAt: Date, reviewedBy: Schema.Types.ObjectId,
}, { timestamps: true, optimisticConcurrency: true });

const FreightRequirementSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: "Associate", required: true }, requesterCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  title: { type: String, required: true, trim: true }, modes: [{ type: String, enum: FREIGHT_MODES }], movementType: String, cargo: Schema.Types.Mixed, origin: location, destination: location,
  incoterm: String, serviceLevel: String, pickupDate: Date, deliveryDate: Date, specialHandling: [String], customsResponsibility: String, requiredDocuments: [String], currency: { type: String, default: "INR" },
  opensAt: Date, closesAt: Date, status: { type: String, enum: FREIGHT_REQUIREMENT_STATUSES, default: "DRAFT", index: true }, winningOffer: { type: Schema.Types.ObjectId, ref: "FreightOffer" }, shipment: { type: Schema.Types.ObjectId, ref: "FreightShipment" }, enquiryId: Schema.Types.ObjectId, orderId: Schema.Types.ObjectId,
  cancellationReason: String, audit: { type: [audit], default: [] }, archivedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });

const FreightOfferSchema = new Schema({
  requirement: { type: Schema.Types.ObjectId, ref: "FreightRequirement", required: true, index: true }, provider: { type: Schema.Types.ObjectId, ref: "Associate", required: true }, providerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
  amount: { type: Number, required: true, min: 0 }, currency: { type: String, required: true }, transitDays: Number, freeDays: Number, validUntil: Date, inclusions: [String], exclusions: [String], surcharges: [Schema.Types.Mixed], schedule: Schema.Types.Mixed, note: String,
  status: { type: String, enum: FREIGHT_OFFER_STATUSES, default: "SUBMITTED" }, revisions: [{ snapshot: Schema.Types.Mixed, at: { type: Date, default: Date.now }, by: Schema.Types.ObjectId }],
}, { timestamps: true, optimisticConcurrency: true });
FreightOfferSchema.index({ requirement: 1, providerCompany: 1 }, { unique: true });

const FreightShipmentSchema = new Schema({
  reference: { type: String, required: true, unique: true, index: true }, ownerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, createdBy: { type: Schema.Types.ObjectId, required: true }, customerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany" }, customerName: String,
  source: { type: String, enum: FREIGHT_SOURCES, required: true }, workflowMode: { type: String, enum: FREIGHT_WORKFLOWS, default: "FULL" }, status: { type: String, enum: FREIGHT_SHIPMENT_STATUSES, default: "DRAFT", index: true }, modes: [{ type: String, enum: FREIGHT_MODES }], movementType: String,
  origin: location, destination: location, incoterm: String, serviceLevel: String, parties: { type: [party], default: [] }, references: Schema.Types.Mixed, cargo: { type: [Schema.Types.Mixed], default: [] }, containers: { type: [Schema.Types.Mixed], default: [] }, legs: { type: [Schema.Types.Mixed], default: [] },
  milestones: { type: [milestone], default: [] }, documents: { type: [document], default: [] }, exceptions: { type: [Schema.Types.Mixed], default: [] }, tasks: { type: [Schema.Types.Mixed], default: [] }, comments: { type: [Schema.Types.Mixed], default: [] },
  requirement: { type: Schema.Types.ObjectId, ref: "FreightRequirement" }, offer: { type: Schema.Types.ObjectId, ref: "FreightOffer" }, enquiryId: Schema.Types.ObjectId, orderId: Schema.Types.ObjectId,
  trackingToken: { type: String, index: true, sparse: true }, audit: { type: [audit], default: [] }, archivedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });

const CustomsCaseSchema = new Schema({
  shipment: { type: Schema.Types.ObjectId, ref: "FreightShipment", required: true, index: true }, ownerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, caseType: { type: String, enum: ["IMPORT", "EXPORT"], required: true }, status: { type: String, enum: CUSTOMS_STATUSES, default: "DRAFT", index: true },
  portCode: String, customsLocation: String, iec: String, gstin: String, adCode: String, broker: Schema.Types.Mixed, declarationType: { type: String, enum: ["BILL_OF_ENTRY", "SHIPPING_BILL"] }, declarationNumber: String, acknowledgementNumber: String,
  invoice: Schema.Types.Mixed, packing: Schema.Types.Mixed, lineItems: { type: [Schema.Types.Mixed], default: [] }, licences: { type: [Schema.Types.Mixed], default: [] }, schemes: [String], duties: Schema.Types.Mixed, queries: { type: [Schema.Types.Mixed], default: [] }, examination: Schema.Types.Mixed, holds: { type: [Schema.Types.Mixed], default: [] }, filingPayload: Schema.Types.Mixed,
  audit: { type: [audit], default: [] }, archivedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });

const FreightFinanceSchema = new Schema({
  shipment: { type: Schema.Types.ObjectId, ref: "FreightShipment", required: true, index: true }, ownerCompany: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true }, kind: { type: String, enum: FINANCE_KINDS, required: true, index: true }, number: { type: String, required: true }, status: { type: String, enum: ["DRAFT", "APPROVED", "POSTED", "PART_PAID", "PAID", "REVERSED", "VOID"], default: "DRAFT" },
  party: Schema.Types.Mixed, currency: { type: String, default: "INR" }, exchangeRate: { type: Number, default: 1 }, baseCurrency: { type: String, default: "INR" }, lines: { type: [Schema.Types.Mixed], default: [] }, subtotal: Number, taxTotal: Number, total: Number, paidAmount: { type: Number, default: 0 }, dueDate: Date, postedAt: Date, reversedBy: { type: Schema.Types.ObjectId, ref: "FreightFinance" }, allocations: { type: [Schema.Types.Mixed], default: [] }, journalLines: { type: [Schema.Types.Mixed], default: [] }, audit: { type: [audit], default: [] }, archivedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });
FreightFinanceSchema.index({ ownerCompany: 1, kind: 1, number: 1 }, { unique: true });

export const FreightProviderProfileModel = mongoose.model("FreightProviderProfile", FreightProviderProfileSchema);
export const FreightRequirementModel = mongoose.model("FreightRequirement", FreightRequirementSchema);
export const FreightOfferModel = mongoose.model("FreightOffer", FreightOfferSchema);
export const FreightShipmentModel = mongoose.model("FreightShipment", FreightShipmentSchema);
export const CustomsCaseModel = mongoose.model("FreightCustomsCase", CustomsCaseSchema);
export const FreightFinanceModel = mongoose.model("FreightFinance", FreightFinanceSchema);

