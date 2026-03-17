import mongoose, { Schema } from "mongoose";
import { IImportListing } from "../../interfaces/importListing";

const ImportListingSchema: Schema = new Schema(
  {
    importerCompanyId: { type: Schema.Types.ObjectId, ref: "AssociateCompany", required: true, index: true },
    importerAssociateId: { type: Schema.Types.ObjectId, ref: "Associate", required: true, index: true },
    commodityName: { type: String, required: true, trim: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null, index: true },
    productVariant: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null, index: true },
    totalQuantity: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0 },
    quantityUnit: { type: String, enum: ["MT", "KG"], default: "MT" },
    price: { type: Number, required: true, min: 0 },
    priceUnit: { type: String, enum: ["MT", "KG"], default: "KG" },
    adminCommission: { type: Number, default: 0, min: 0 },
    expectedArrivalDate: { type: Date, default: null },
    arrivalWindowDays: { type: Number, default: null },
    portId: { type: Schema.Types.ObjectId, ref: "UnLoCode", default: null },
    portName: { type: String, default: null },
    country: { type: String, default: "India" },
    status: {
      type: String,
      enum: ["OPEN", "PARTIAL", "FULL", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ImportListingSchema.index({ importerCompanyId: 1, createdAt: -1 });
ImportListingSchema.index({ importerAssociateId: 1, createdAt: -1 });
ImportListingSchema.index({ status: 1, createdAt: -1 });

export const ImportListingModel = mongoose.model<IImportListing>(
  "ImportListing",
  ImportListingSchema
);
