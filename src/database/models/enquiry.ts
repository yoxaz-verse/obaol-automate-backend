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

        // Internal assignment
        assignedEmployeeId: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
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
