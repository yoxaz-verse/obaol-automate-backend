import { IProduct } from "../../interfaces/product";
import mongoose, { Document, Schema } from "mongoose";

const ProductSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true, index: true },
  description: { type: String, required: true },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: "SubCategory",
    required: true,
  },
  state: [{ type: Schema.Types.ObjectId, ref: "State" }],
  isConventional: { type: Boolean, default: true, index: true },
  isNatural: { type: Boolean, default: false, index: true },
  isOrganic: { type: Boolean, default: false, index: true },
  isIpmQuality: { type: Boolean, default: false, index: true },
  isOrganicCertified: { type: Boolean, default: false, index: true },
  organicCertificationBody: { type: String, default: "", trim: true },
  organicCertificationBodyOther: { type: String, default: "", trim: true },
  organicCertificateNumber: { type: String, default: "", trim: true },
  organicCertificateValidFrom: { type: Date, default: null },
  organicCertificateValidTo: { type: Date, default: null },
  organicCertifiedQuantity: { type: Number, default: 0 },
  organicCertifiedQuantityUnit: { type: String, default: "KG", trim: true },
  organicCertificationScope: { type: String, default: "NPOP", trim: true },
  organicCertificateDocumentUrl: { type: String, default: "", trim: true },
  isGiTagged: { type: Boolean, default: false, index: true },
  giName: { type: String, default: "", trim: true },
  giCertificateNumber: { type: String, default: "", trim: true },
  giDocumentUrl: { type: String, default: "", trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
});

const slugify = (value: string) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

ProductSchema.pre("save", async function productSlugHook(next) {
  try {
    const self = this as any;
    if (!self.isModified("name") && self.slug) return next();

    const base = slugify(self.slug || self.name || "product");
    const fallbackBase = base || "product";
    let candidate = fallbackBase;
    let i = 1;

    while (true) {
      const existing = await ProductModel.findOne({
        slug: candidate,
        _id: { $ne: self._id },
      }).select("_id").lean();
      if (!existing) break;
      i += 1;
      candidate = `${fallbackBase}-${i}`;
    }

    self.slug = candidate;
    return next();
  } catch (error) {
    return next(error as any);
  }
});

export const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);
