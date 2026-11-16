import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { LabProfileModel } from "../database/models/labProfile";
import { ServiceProviderProfileModel } from "../database/models/serviceProviderProfile";
import { FreightProviderProfileModel } from "../database/models/freightForwarding";
import { InlandTransportProfileModel, InlandVehicleModel } from "../database/models/inlandTransportation";

export const SERVICE_DIRECTORY_CATEGORIES = [
  "procurement-partners", "warehouse-owners", "inland-transportation", "freight-forwarding",
  "logistics-providers", "packaging", "quality-testing", "customs-clearance-agencies",
  "finance-partners", "insurance-partners", "agritech-companies",
] as const;

const aliases: Record<string, string[]> = {
  "procurement-partners": ["procurement", "procurement-partners", "sourcing"],
  "warehouse-owners": ["warehouse", "warehouse-storage", "warehouse-owners"],
  "inland-transportation": ["inland-transportation", "inland-logistics", "transportation"],
  "freight-forwarding": ["freight-forwarding", "freight-forwarder", "freight_forwarding", "freight"],
  "logistics-providers": ["logistics", "logistics-providers", "inland-logistics"],
  packaging: ["packaging", "packaging-companies"],
  "quality-testing": ["testing", "quality-testing", "quality-testing-labs"],
  "customs-clearance-agencies": ["customs", "customs-clearance-agencies"],
  "finance-partners": ["finance", "finance-risk", "finance-partners"],
  "insurance-partners": ["insurance", "insurance-partners", "finance-risk"],
  "agritech-companies": ["agritech", "agritech-companies"],
};
const safeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const role = (req: Request) => String((req as any).user?.role || "").toLowerCase();
const ids = (rows: any[]) => rows.map((row) => row.companyId?._id || row.companyId).filter(Boolean);

async function enrich(companies: any[]) {
  const companyIds = companies.map((company) => company._id);
  const [labs, packaging, freight, transport, vehicles] = await Promise.all([
    LabProfileModel.find({ companyId: { $in: companyIds }, published: { $ne: null } }).select("companyId status published").lean(),
    ServiceProviderProfileModel.find({ companyId: { $in: companyIds }, department: "PACKAGING", published: { $ne: null } }).select("companyId status published").lean(),
    FreightProviderProfileModel.find({ companyId: { $in: companyIds }, published: { $ne: null } }).select("companyId status published").lean(),
    InlandTransportProfileModel.find({ companyId: { $in: companyIds } }).lean(),
    InlandVehicleModel.find({ companyId: { $in: companyIds }, publiclyListed: true, status: { $ne: "INACTIVE" } }).select("companyId vehicleType supportedCargo status complianceExpiresAt").lean(),
  ]);
  const group = (rows: any[]) => rows.reduce((map, row) => { const key = String(row.companyId); (map[key] ||= []).push(row); return map; }, {} as Record<string, any[]>);
  const labBy = group(labs), packagingBy = group(packaging), freightBy = group(freight), transportBy = group(transport), vehicleBy = group(vehicles);
  return companies.map((company) => {
    const key = String(company._id); const lab = labBy[key]?.[0]; const pack = packagingBy[key]?.[0]; const forwarder = freightBy[key]?.[0]; const transportProfile = transportBy[key]?.[0]; const fleet = vehicleBy[key] || [];
    const categories = SERVICE_DIRECTORY_CATEGORIES.filter((category) => aliases[category].some((slug) => (company.providedCapabilities || []).includes(slug)));
    const primary = lab?.published || pack?.published || forwarder?.published || transportProfile || {};
    return {
      companyId: company._id, name: primary.displayName || company.name, summary: primary.summary || company.description || company.aboutUs || "",
      categories, status: company.registrationStatus, approved: Boolean(company.isApproved && company.registrationStatus === "APPROVED"),
      verified: company.gstVerificationStatus === "VERIFIED", logo: company.logo || "",
      contact: { email: primary.contactEmail || company.email || "", phone: primary.contactPhone || primary.contactWhatsapp || company.phone || "", whatsapp: primary.whatsappPhone || primary.contactWhatsapp || "", website: primary.website || company.website || "" },
      location: primary.locations?.[0] || { label: company.location?.label || company.address || company.registeredAddress || "", country: company.country?.name || "", state: company.state?.name || "" },
      capabilities: [...new Set([...(primary.modes || []), ...(primary.services || []), ...(primary.serviceAreas || []), ...(primary.vehicleTypes || []), ...(company.tags || [])])],
      specialized: { labProfileId: lab?._id || null, packagingProfileId: pack?._id || null, freightProfileId: forwarder?._id || null, transportProfileId: transportProfile?._id || null },
      transport: transportProfile ? { fleetCount: fleet.length, vehicleTypes: [...new Set(fleet.map((vehicle: any) => vehicle.vehicleType).filter(Boolean))], cargoTypes: transportProfile.cargoTypes || [] } : null,
      updatedAt: company.updatedAt,
    };
  });
}

export class ServiceDirectoryController {
  async list(req: Request, res: Response) {
    const adminView = String(req.query.admin || "") === "true";
    if (adminView && role(req) !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });
    const category = String(req.query.category || "").trim(); const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 18));
    const filter: any = { isDeleted: { $ne: true }, providedCapabilities: { $in: category && aliases[category] ? aliases[category] : Object.values(aliases).flat() } };
    if (!adminView) Object.assign(filter, { registrationStatus: "APPROVED", isApproved: true });
    if (adminView && req.query.status) filter.registrationStatus = String(req.query.status).toUpperCase();
    if (search) { const matcher = new RegExp(safeRegex(search), "i"); filter.$or = [{ name: matcher }, { description: matcher }, { aboutUs: matcher }, { address: matcher }, { registeredAddress: matcher }, { tags: matcher }]; }
    const [companies, total] = await Promise.all([
      AssociateCompanyModel.find(filter).populate("country state", "name").select("name email phone providedCapabilities description aboutUs address registeredAddress location website tags logo registrationStatus isApproved gstVerificationStatus country state updatedAt").sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      AssociateCompanyModel.countDocuments(filter),
    ]);
    return res.json({ success: true, data: await enrich(companies), facets: { categories: SERVICE_DIRECTORY_CATEGORIES }, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  }

  async detail(req: Request, res: Response) {
    if (!Types.ObjectId.isValid(req.params.companyId)) return res.status(400).json({ success: false, message: "Invalid company id." });
    const admin = role(req) === "admin"; const filter: any = { _id: req.params.companyId, isDeleted: { $ne: true } };
    if (!admin) Object.assign(filter, { registrationStatus: "APPROVED", isApproved: true });
    const company = await AssociateCompanyModel.findOne(filter).populate("country state", "name").lean();
    if (!company) return res.status(404).json({ success: false, message: "Service provider not found." });
    const [provider] = await enrich([company]); return res.json({ success: true, data: provider });
  }

  async vehicles(req: Request, res: Response) {
    if (!Types.ObjectId.isValid(req.params.companyId)) return res.status(400).json({ success: false, message: "Invalid company id." });
    const profile = await InlandTransportProfileModel.exists({ companyId: req.params.companyId, status: "ACTIVE" });
    if (!profile) return res.status(404).json({ success: false, message: "Active transport provider not found." });
    const now = new Date(); const rows = await InlandVehicleModel.find({ companyId: req.params.companyId, publiclyListed: true, status: { $in: ["AVAILABLE", "ASSIGNED", "MAINTENANCE"] }, $or: [{ complianceExpiresAt: null }, { complianceExpiresAt: { $gte: now } }] }).select("publicAlias manufacturer model modelYear vehicleType bodyType capacity capacityUnit supportedCargo imageUrls baseLocation status complianceExpiresAt").sort({ status: 1, publicAlias: 1 }).lean();
    return res.json({ success: true, data: rows });
  }
}

export const serviceDirectoryController = new ServiceDirectoryController();
