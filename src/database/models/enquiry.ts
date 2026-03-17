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
        packagingSpecifications: {
            type: String,
            maxlength: 4000,
            trim: true,
            default: ""
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

        // Source context (optional)
        sourceType: {
            type: String,
            enum: ["STANDARD", "IMPORT"],
            default: "STANDARD",
            index: true
        },
        importListingId: {
            type: Schema.Types.ObjectId,
            ref: "ImportListing",
            default: null,
            index: true
        },
        importReservationId: {
            type: Schema.Types.ObjectId,
            ref: "ImportReservation",
            default: null,
            index: true
        },
        arrivalPortId: {
            type: Schema.Types.ObjectId,
            ref: "UnLoCode",
            default: null
        },
        arrivalPortName: {
            type: String,
            default: null
        },
        expectedArrivalDate: {
            type: Date,
            default: null
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
            cargoInsuranceBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
            exportCustomsBy: { type: String, enum: ["buyer", "seller", "obaol"], default: "obaol" },
            importCustomsBy: { type: String, enum: ["buyer", "obaol"], default: "buyer" },
            dutiesTaxesBy: { type: String, enum: ["buyer"], default: "buyer" },
            portHandlingBy: { type: String, enum: ["buyer", "obaol"], default: "buyer" },
            destinationInlandTransportBy: { type: String, enum: ["buyer", "obaol"], default: "buyer" },
            destinationInspectionBy: { type: String, enum: ["buyer", "obaol"], default: "buyer" },
            finalDeliveryConfirmationBy: { type: String, enum: ["obaol"], default: "obaol" },
        },
        executionContext: {
            tradeType: { type: String, enum: ["DOMESTIC", "INTERNATIONAL"], default: "DOMESTIC" },
            originCountry: { type: String, default: null },
            originState: { type: String, default: null },
            originDistrict: { type: String, default: null },
            originPort: { type: String, default: null },
            destinationCountry: { type: String, default: null },
            destinationState: { type: String, default: null },
            destinationDistrict: { type: String, default: null },
            destinationPort: { type: String, default: null },
            routeNotes: { type: String, default: null },
        },
        responsibilitiesFinalizedAt: {
            type: Date,
            default: null
        },
        executionInquiries: [
            {
                type: {
                    type: String,
                    enum: ["PROCUREMENT", "CERTIFICATION", "TRANSPORTATION", "SHIPPING", "PACKAGING", "QUALITY_TESTING"],
                    required: true
                },
                ownerBy: {
                    type: String,
                    enum: ["buyer", "seller", "obaol"],
                    required: true
                },
                status: {
                    type: String,
                    enum: ["OPEN", "IN_PROGRESS", "COMPLETED"],
                    default: "OPEN"
                },
                title: { type: String, required: true },
                details: {
                    tradeType: { type: String, enum: ["DOMESTIC", "INTERNATIONAL"], default: "DOMESTIC" },
                    from: { type: String, default: null },
                    to: { type: String, default: null },
                    routeNotes: { type: String, default: null },
                    requiresShipping: { type: Boolean, default: false },
                    fromState: { type: String, default: null },
                    fromDistrict: { type: String, default: null },
                    packagingSpecifications: { type: String, default: null },
                },
                candidateProviders: [{ type: Schema.Types.ObjectId, ref: "AssociateCompany" }],
                bids: [
                    {
                        company: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true },
                        amount: { type: Number, default: null },
                        note: { type: String, default: null },
                        status: { type: String, enum: ["OPEN", "SUBMITTED", "WITHDRAWN", "AWARDED"], default: "SUBMITTED" },
                        createdBy: { type: Schema.Types.ObjectId, ref: "Associate", default: null },
                        createdAt: { type: Date, default: Date.now },
                        updatedAt: { type: Date, default: Date.now }
                    }
                ],
                committedProvider: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null },
                bidAmount: { type: Number, default: null },
                commitNote: { type: String, default: null },
                committedAt: { type: Date, default: null },
                createdAt: { type: Date, default: Date.now }
            }
        ],

        // Internal assignment
        assignedOperatorId: {
            type: Schema.Types.ObjectId,
            ref: "Operator",
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
        // Industry workflow stage (additive, does not replace status)
        workflowStage: {
            type: String,
            default: "INQUIRY_CREATED",
            index: true
        },
        isDemo: { type: Boolean, default: false, index: true },
        demoTag: { type: String, default: null, index: true },
        demoCreatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

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
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound indexes for efficient querying
InquirySchema.index({ status: 1, createdAt: -1 });
InquirySchema.index({ assignedOperatorId: 1, status: 1 });
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
