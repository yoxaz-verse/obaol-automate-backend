import crypto from "crypto";
import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CatalogItemModel } from "../database/models/catalogItem";
import { LabProfileModel } from "../database/models/labProfile";
import { ServiceProviderProfileModel } from "../database/models/serviceProviderProfile";
import { FreightProviderProfileModel } from "../database/models/freightForwarding";
import { InlandTransportProfileModel } from "../database/models/inlandTransportation";
import { WarehouseModel } from "../database/models/warehouse";
import { AssociateReferralShareModel, AssociateReferralShareVisitModel, ReferralShareType } from "../database/models/associateReferralShare";
import { AssociateReferralService } from "./associateReferral.service";
import { assertVariantRateEligible } from "./catalogModeration.service";

const clean = (value: unknown, max = 500) => String(value || "").trim().slice(0, max);
const safeArray = (value: unknown) => Array.isArray(value) ? value : [];
const tokenFor = (id: mongoose.Types.ObjectId) => crypto.createHmac("sha256", process.env.JWT_SECRET || "secret").update(`associate-offering-share:${id}`).digest("hex");
const tokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export type ShareOffering = { id: string; type: ReferralShareType; title: string; description: string; details: Record<string, unknown>; price?: number; unit?: string };

export class AssociateReferralShareService {
  static async companyIsEligible(companyId: string | mongoose.Types.ObjectId) {
    return AssociateCompanyModel.exists({ _id: companyId, registrationStatus: "APPROVED", isApproved: true, isDeleted: { $ne: true } });
  }

  static async resolveOffering(companyId: string | mongoose.Types.ObjectId, type: ReferralShareType, offeringId: string | mongoose.Types.ObjectId): Promise<ShareOffering | null> {
    if (!mongoose.Types.ObjectId.isValid(String(companyId)) || !mongoose.Types.ObjectId.isValid(String(offeringId)) || !await this.companyIsEligible(companyId)) return null;
    if (type === "PRODUCT") {
      const row: any = await CatalogItemModel.findOne({ _id: offeringId, associateCompanyId: companyId, isLive: true, listingState: "LIVE" })
        .populate({ path: "productVariantId", populate: { path: "product", select: "name description" } }).lean();
      if (!row) return null;
      try { await assertVariantRateEligible(row.baseRateId, { requireLive: true }); } catch { return null; }
      const variant = row.productVariantId || {}, product = variant.product || {};
      return { id: String(row._id), type, title: clean(row.customTitle || `${product.name || "Product"} - ${variant.name || "Variant"}`, 180), description: clean(row.customDescription || product.description), price: Number(row.finalPrice), unit: clean(row.unit || variant.unit || "unit", 30), details: { product: clean(product.name, 160), variant: clean(variant.name, 160) } };
    }
    if (type === "QUALITY_LAB") {
      const row: any = await LabProfileModel.findOne({ _id: offeringId, companyId, status: "PUBLISHED", published: { $ne: null } }).lean();
      if (!row) return null; const p = row.published || {};
      return { id: String(row._id), type, title: clean(p.displayName, 180), description: clean(p.summary), details: { location: clean([p.city, p.state].filter(Boolean).join(", "), 180), capabilities: safeArray(p.productCapabilityTemplates).map((x: any) => clean(x.name || "Testing capability", 120)).filter(Boolean).slice(0, 12), credentials: safeArray(p.credentials).filter((x: any) => x.verificationStatus === "VERIFIED").length } };
    }
    if (type === "PACKAGING") {
      const row: any = await ServiceProviderProfileModel.findOne({ _id: offeringId, companyId, status: "PUBLISHED", published: { $ne: null } }).lean();
      if (!row) return null; const p = row.published || {};
      return { id: String(row._id), type, title: clean(p.displayName, 180), description: clean(p.summary), details: { capabilities: safeArray(p.capabilities).map((x: any) => clean(x.name, 120)).filter(Boolean).slice(0, 12), locations: safeArray(p.locations).map((x: any) => clean([x.city, x.state, x.country].filter(Boolean).join(", "), 160)).filter(Boolean).slice(0, 8) } };
    }
    if (type === "FREIGHT") {
      const row: any = await FreightProviderProfileModel.findOne({ _id: offeringId, companyId, status: "PUBLISHED", published: { $ne: null } }).lean();
      if (!row) return null; const p = row.published || {};
      return { id: String(row._id), type, title: clean(p.displayName || "Freight forwarding services", 180), description: clean(p.summary), details: { modes: safeArray(p.modes).map((x) => clean(x, 60)).slice(0, 12), coverage: safeArray(p.serviceAreas || p.coverage).map((x) => clean(x, 100)).slice(0, 12) } };
    }
    if (type === "INLAND_TRANSPORT") {
      const row: any = await InlandTransportProfileModel.findOne({ _id: offeringId, companyId, status: "ACTIVE" }).lean();
      if (!row) return null;
      return { id: String(row._id), type, title: clean(row.displayName || "Inland transportation services", 180), description: clean(row.summary), details: { serviceAreas: safeArray(row.serviceAreas).map((x) => clean(x, 100)).slice(0, 12), vehicleTypes: safeArray(row.vehicleTypes).map((x) => clean(x, 100)).slice(0, 12), cargoTypes: safeArray(row.cargoTypes).map((x) => clean(x, 100)).slice(0, 12) } };
    }
    if (type === "WAREHOUSE") {
      const row: any = await WarehouseModel.findOne({ _id: offeringId, ownerCompanyId: companyId, isActive: true, listingType: "RENTAL", isRentalActive: true, listingState: "LIVE" }).lean();
      if (!row) return null;
      return { id: String(row._id), type, title: clean(row.name || "Warehouse services", 180), description: clean(`${row.category || "Storage"} warehouse capacity available on OBAOL.`), price: Number(row.storageRatePerUnit), unit: clean(row.unit || "MT", 30), details: { location: clean(row.location?.label || [row.location?.city, row.location?.state].filter(Boolean).join(", "), 180), category: clean(row.category, 80), capacity: Number(row.totalCapacity || 0) } };
    }
    return null;
  }

  static async listOfferings(companyId: string) {
    const [products, labs, packaging, freight, inland, warehouses] = await Promise.all([
      CatalogItemModel.find({ associateCompanyId: companyId, isLive: true, listingState: "LIVE" }).select("_id").lean(),
      LabProfileModel.find({ companyId, status: "PUBLISHED", published: { $ne: null } }).select("_id").lean(),
      ServiceProviderProfileModel.find({ companyId, status: "PUBLISHED", published: { $ne: null } }).select("_id").lean(),
      FreightProviderProfileModel.find({ companyId, status: "PUBLISHED", published: { $ne: null } }).select("_id").lean(),
      InlandTransportProfileModel.find({ companyId, status: "ACTIVE" }).select("_id").lean(),
      WarehouseModel.find({ ownerCompanyId: companyId, isActive: true, listingType: "RENTAL", isRentalActive: true, listingState: "LIVE" }).select("_id").lean(),
    ]);
    const refs: [ReferralShareType, any[]][] = [["PRODUCT", products], ["QUALITY_LAB", labs], ["PACKAGING", packaging], ["FREIGHT", freight], ["INLAND_TRANSPORT", inland], ["WAREHOUSE", warehouses]];
    const rows = await Promise.all(refs.flatMap(([type, values]) => values.map((row) => this.resolveOffering(companyId, type, row._id))));
    return rows.filter(Boolean).map(({ price, ...row }: any) => row);
  }

  static async create(companyId: string, type: ReferralShareType, offeringId: string) {
    const offering = await this.resolveOffering(companyId, type, offeringId);
    if (!offering) throw Object.assign(new Error("This offering is not published or does not belong to your company."), { status: 404 });
    let share: any = await AssociateReferralShareModel.findOne({ referrerCompanyId: companyId, offeringType: type, offeringId });
    if (!share) { const _id = new mongoose.Types.ObjectId(); share = await AssociateReferralShareModel.create({ _id, referrerCompanyId: companyId, offeringType: type, offeringId, tokenHash: tokenHash(tokenFor(_id)) }); }
    if (share.status !== "ACTIVE") { share.status = "ACTIVE"; await share.save(); }
    return { share, token: tokenFor(share._id), offering };
  }

  static async resolve(token: unknown) {
    const normalized = clean(token, 64).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalized)) return null;
    const share: any = await AssociateReferralShareModel.findOne({ tokenHash: tokenHash(normalized), status: "ACTIVE" }).select("+tokenHash").lean();
    if (!share) return null;
    const offering = await this.resolveOffering(share.referrerCompanyId, share.offeringType, share.offeringId);
    if (!offering) return null;
    const company: any = await AssociateCompanyModel.findById(share.referrerCompanyId).select("name referralCode").lean();
    if (!company) return null;
    const referralCode = company.referralCode || await AssociateReferralService.ensureCompanyCode(company._id);
    return { share, offering, company: { id: String(company._id), name: clean(company.name, 180), referralCode }, token: normalized };
  }

  static async recordVisit(shareId: mongoose.Types.ObjectId, fingerprint: string, channel: unknown) {
    const dayBucket = new Date().toISOString().slice(0, 10), visitorHash = crypto.createHash("sha256").update(fingerprint).digest("hex");
    let unique = false;
    try { await AssociateReferralShareVisitModel.create({ shareId, visitorHash, dayBucket, channel: clean(channel || "DIRECT", 40).toUpperCase() }); unique = true; } catch (error: any) { if (error?.code !== 11000) throw error; }
    await AssociateReferralShareModel.updateOne({ _id: shareId }, { $inc: { clickCount: 1, ...(unique ? { uniqueClickCount: 1 } : {}) }, $set: { lastClickedAt: new Date() } });
  }

  static async validateForRegistration(token: unknown, referralCode: unknown) {
    const resolved = await this.resolve(token);
    if (!resolved) throw Object.assign(new Error("This shared offering link is invalid or no longer available."), { status: 400 });
    if (referralCode && AssociateReferralService.normalizeCode(referralCode) !== AssociateReferralService.normalizeCode(resolved.company.referralCode)) throw Object.assign(new Error("The shared offering does not match the referral code."), { status: 400 });
    return resolved;
  }

  static async recordSignup(token: unknown, companyId: mongoose.Types.ObjectId) {
    const resolved = await this.resolve(token); if (!resolved) return false;
    await AssociateReferralShareModel.updateOne({ _id: resolved.share._id }, { $inc: { signupCount: 1 } });
    return true;
  }
}
