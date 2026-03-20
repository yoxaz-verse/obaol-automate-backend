import mongoose, { Schema } from "mongoose";
import { IServiceRequest } from "../../interfaces/serviceRequest";

export const SERVICE_REQUEST_TYPES = [
  "PROCUREMENT",
  "QUALITY_TESTING",
  "PACKAGING",
  "TRANSPORTATION",
  "CUSTOMS_CLEARANCE",
  "WAREHOUSING",
] as const;

export const SERVICE_REQUEST_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const ServiceRequestSchema: Schema = new Schema(
  {
    requestType: {
      type: String,
      enum: SERVICE_REQUEST_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    serviceSpecifications: {
      type: String,
      required: true,
      trim: true,
      maxlength: 6000,
    },
    fromState: {
      type: Schema.Types.ObjectId,
      ref: "State",
      required: true,
      index: true,
    },
    fromDistrict: {
      type: Schema.Types.ObjectId,
      ref: "District",
      required: true,
      index: true,
    },
    toState: {
      type: Schema.Types.ObjectId,
      ref: "State",
      default: null,
    },
    toDistrict: {
      type: Schema.Types.ObjectId,
      ref: "District",
      default: null,
    },
    requiredFromDate: {
      type: Date,
      default: null,
    },
    requiredToDate: {
      type: Date,
      default: null,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    createdByRole: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    createdByAssociateId: {
      type: Schema.Types.ObjectId,
      ref: "Associate",
      default: null,
    },
    createdByCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "AssociateCompany",
      default: null,
    },
    status: {
      type: String,
      enum: SERVICE_REQUEST_STATUSES,
      default: "OPEN",
      index: true,
    },
    candidateProviders: [
      {
        type: Schema.Types.ObjectId,
        ref: "AssociateCompany",
      },
    ],
    bids: [
      {
        company: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true },
        amount: { type: Number, default: null },
        note: { type: String, default: "" },
        status: { type: String, enum: ["OPEN", "SUBMITTED", "WITHDRAWN", "AWARDED"], default: "SUBMITTED" },
        createdBy: { type: Schema.Types.ObjectId, ref: "Associate", default: null },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    committedProvider: {
      type: Schema.Types.ObjectId,
      ref: "AssociateCompany",
      default: null,
    },
    bidAmount: {
      type: Number,
      default: null,
    },
    commitNote: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    committedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

ServiceRequestSchema.index({ status: 1, createdAt: -1 });
ServiceRequestSchema.index({ requestType: 1, createdAt: -1 });
ServiceRequestSchema.index({ createdByUserId: 1, createdAt: -1 });
ServiceRequestSchema.index({ candidateProviders: 1, createdAt: -1 });

export const ServiceRequestModel =
  mongoose.models.ServiceRequest || mongoose.model<IServiceRequest>("ServiceRequest", ServiceRequestSchema);
