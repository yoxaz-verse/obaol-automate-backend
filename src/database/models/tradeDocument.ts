import mongoose, { Schema } from "mongoose";
import { ITradeDocument } from "../../interfaces/tradeDocument";

const PartySnapshotSchema = new Schema(
  {
    associateId: { type: Schema.Types.ObjectId, ref: "Associate", default: null },
    companyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null },
    name: { type: String },
    contactName: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    gstin: { type: String },
    logo: { type: String },
  },
  { _id: false }
);

const LineItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    productName: { type: String },
    productVariantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    productVariantName: { type: String },
    quantityMT: { type: Number, default: 0 },
    quantityKG: { type: Number, default: 0 },
    unit: { type: String, default: "MT" },
    ratePerKg: { type: Number, default: 0 },
    commissionPerKg: { type: Number, default: 0 },
    description: { type: String, default: "" },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const TotalsSchema = new Schema(
  {
    currency: { type: String, default: "INR" },
    subtotal: { type: Number, default: 0 },
    commissionTotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const TermsSchema = new Schema(
  {
    incotermId: { type: Schema.Types.ObjectId, ref: "Incoterm", default: null },
    incotermCode: { type: String },
    paymentTerms: { type: String, default: "" },
    deliveryTerms: { type: String, default: "" },
    termsAndConditions: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const TradeDocumentSchema: Schema = new Schema(
  {
    ownerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", default: null, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "CommercialCustomer", default: null, index: true },
    type: {
      type: String,
      enum: [
        "LOI",
        "QUOTATION",
        "PROFORMA_INVOICE",
        "INVOICE",
        "PURCHASE_ORDER",
        "SALES_CONTRACT",
        "PACKING_LIST",
        "QUALITY_CERTIFICATE",
        "INSPECTION_CERTIFICATE",
        "PHYTOSANITARY_CERTIFICATE",
        "FUMIGATION_CERTIFICATE",
        "BILL_OF_LADING",
        "AIR_WAYBILL",
        "INSURANCE_CERTIFICATE",
        "PAYMENT_ADVICE",
        "LORRY_RECEIPT",
        "LCL_DRAFT",
        "SHIPPING_BILL",
        "CERTIFICATE_OF_ORIGIN",
        "DISPATCH_CHALLAN",
        "BILL_OF_ENTRY",
        "CUSTOMS_CLEARANCE",
        "GOODS_RECEIPT"
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    documentNumber: { type: String, required: true, index: true },
    revision: { type: Number, default: 1 },
    revisionOf: { type: Schema.Types.ObjectId, ref: "TradeDocument", default: null, index: true },
    revisionOpenKey: { type: String, default: null },
    sourceQuotationId: { type: Schema.Types.ObjectId, ref: "TradeDocument", default: null, index: true },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: "TradeDocument", default: null, index: true },
    conversionRuleId: { type: Schema.Types.ObjectId, ref: "DocumentConversionRule", default: null, index: true },
    issueDate: { type: Date, default: Date.now },
    validUntil: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    templateSnapshot: { type: Schema.Types.Mixed, default: null },
    selectedTemplateId: { type: Schema.Types.ObjectId, ref: "DocumentTemplate", default: null, index: true },
    selectedTemplateVersion: { type: Number, default: null },
    documentData: { type: Schema.Types.Mixed, default: {} },
    issuedAt: { type: Date, default: null },
    fileUrl: { type: String, default: null },
    sourceMode: { type: String, enum: ["CREATED", "UPLOADED"], default: "CREATED", index: true },
    originalFileName: { type: String, default: "" },
    fileMimeType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    extractionJobId: { type: Schema.Types.ObjectId, ref: "DocumentExtractionJob", default: null, index: true },
    extractionStatus: { type: String, enum: ["NOT_REQUIRED", "QUEUED", "PROCESSING", "REVIEW_REQUIRED", "COMPLETED", "FAILED"], default: "NOT_REQUIRED", index: true },
    extractionReviewedAt: { type: Date, default: null },
    extractionReviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verifiedStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      index: true
    },
    enquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry", default: null, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    inventoryReservationId: { type: Schema.Types.ObjectId, ref: "InventoryReservation", default: null },
    buyer: { type: PartySnapshotSchema, default: {} },
    seller: { type: PartySnapshotSchema, default: {} },
    lineItems: { type: [LineItemSchema], default: [] },
    totals: { type: TotalsSchema, default: {} },
    terms: { type: TermsSchema, default: {} },
    payments: {
      type: [{ amount: { type: Number, required: true }, paidAt: { type: Date, required: true }, reference: { type: String, default: "" }, notes: { type: String, default: "" }, recordedBy: { type: Schema.Types.ObjectId, default: null } }],
      default: [],
    },
    decision: { type: String, enum: ["ACCEPTED", "REJECTED", null], default: null },
    decidedAt: { type: Date, default: null },
    decisionSource: { type: String, enum: ["PORTAL", "SELLER_RECORDED", null], default: null },
    decisionReference: { type: String, default: "" },
    decisionNotes: { type: String, default: "" },
    decisionProofUrl: { type: String, default: null },
    inviteTokenHash: { type: String, default: null, select: false },
    inviteExpiresAt: { type: Date, default: null },
    inviteRevokedAt: { type: Date, default: null },
    firstViewedAt: { type: Date, default: null },
    lastViewedAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date, default: null },
    downloadCount: { type: Number, default: 0 },
    auditEvents: { type: [{ action: String, actorId: { type: Schema.Types.ObjectId, default: null }, actorRole: String, metadata: Schema.Types.Mixed, createdAt: { type: Date, default: Date.now } }], default: [] },
    legacyCommercialDocumentId: { type: Schema.Types.ObjectId, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    audienceScope: {
      type: String,
      enum: ["SELLER_OBAOL", "OBAOL_BUYER"],
      default: "SELLER_OBAOL",
      index: true,
    },
    isDemo: { type: Boolean, default: false, index: true },
    demoTag: { type: String, default: null, index: true },
    demoCreatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

TradeDocumentSchema.index({ enquiryId: 1, type: 1 });
TradeDocumentSchema.index({ orderId: 1, type: 1 });
TradeDocumentSchema.index({ ownerCompanyId: 1, createdAt: -1 });
TradeDocumentSchema.index({ inviteTokenHash: 1 }, { sparse: true });
TradeDocumentSchema.index({ ownerCompanyId: 1, sourceQuotationId: 1 }, { unique: true, partialFilterExpression: { sourceQuotationId: { $type: "objectId" } } });
TradeDocumentSchema.index({ ownerCompanyId: 1, sourceDocumentId: 1, conversionRuleId: 1 }, { unique: true, partialFilterExpression: { sourceDocumentId: { $type: "objectId" }, conversionRuleId: { $type: "objectId" } } });
TradeDocumentSchema.index({ revisionOpenKey: 1 }, { unique: true, partialFilterExpression: { revisionOpenKey: { $type: "string" } } });
TradeDocumentSchema.index({ legacyCommercialDocumentId: 1 }, { unique: true, partialFilterExpression: { legacyCommercialDocumentId: { $type: "objectId" } } });

export const TradeDocumentModel = mongoose.model<ITradeDocument>(
  "TradeDocument",
  TradeDocumentSchema
);
