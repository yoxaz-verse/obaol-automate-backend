import mongoose, { Schema } from "mongoose";
import { IInquiry } from "../../interfaces/enquiry";
import { InquiryStatus } from "../../core/inquiry/inquiryStateMachine";

const InquirySchema: Schema = new Schema(
    {
        // Product details
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },
        quantity: {
            type: Number,
            min: 0
        },
        specifications: {
            type: String,
            maxlength: 2000
        },
        variantRateId: {
            type: Schema.Types.ObjectId,
            ref: "VariantRate",
            default: null,
            index: true
        },
        catalogItemId: {
            type: Schema.Types.ObjectId,
            ref: "CatalogItem",
            default: null,
            index: true
        },

        // Associate roles (all reference Associate collection)
        buyerAssociateId: {
            type: Schema.Types.ObjectId,
            ref: "Associate",
            required: true,
            index: true
        },
        sellerAssociateId: {
            type: Schema.Types.ObjectId,
            ref: "Associate",
            required: true,
            index: true
        },
        mediatorAssociateId: {
            type: Schema.Types.ObjectId,
            ref: "Associate",
            default: null,
            index: true
        },

        // Commercial terms
        preferredIncoterm: {
            type: Schema.Types.ObjectId,
            ref: "Incoterm",
            default: null,
            index: true
        },

        // Supplier commitment window (e.g. price valid until)
        supplierCommitUntil: {
            type: Date,
            default: null
        },

        // Acceptance markers
        sellerAcceptedAt: {
            type: Date,
            default: null
        },
        buyerConfirmedAt: {
            type: Date,
            default: null
        },
        responsibilityPlan: {
            procurementBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
            certificateBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
            transportBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
            shippingBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
            packagingBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
            qualityTestingBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
        },

        // Internal assignment
        assignedEmployeeId: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
            index: true
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            default: null,
            index: true
        },

        // Status (controlled by state machine)
        status: {
            type: String,
            enum: Object.values(InquiryStatus),
            default: InquiryStatus.NEW,
            required: true,
            index: true
        },

        // Financials & Commissions
        rate: {
            type: Number,
            min: 0
        },
        adminCommission: {
            type: Number,
            min: 0
        },
        mediatorCommission: {
            type: Number,
            min: 0
        },

        // Internal notes (NEVER exposed to associates)
        notes: {
            type: String,
            maxlength: 5000,
            select: false // Exclude by default in queries
        },

        // Audit fields
        createdBy: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Compound indexes for efficient querying
InquirySchema.index({ status: 1, createdAt: -1 });
InquirySchema.index({ assignedEmployeeId: 1, status: 1 });
InquirySchema.index({ buyerAssociateId: 1, createdAt: -1 });
InquirySchema.index({ sellerAssociateId: 1, createdAt: -1 });

// Validation: Buyer and seller must be different
InquirySchema.pre<IInquiry>("save", function (next) {
    if (this.buyerAssociateId.equals(this.sellerAssociateId)) {
        next(new Error("Buyer and seller cannot be the same associate"));
    } else {
        next();
    }
});

export const InquiryModel = mongoose.model<IInquiry>(
    "Inquiry",
    InquirySchema
);
