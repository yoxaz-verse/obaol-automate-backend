import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CountryModel } from "../database/models/country";
import { LabProfileModel } from "../database/models/labProfile";
import { LAB_TAXONOMY_KINDS, LabTaxonomyModel } from "../database/models/labTaxonomy";

const role = (req: Request) => String(req.user?.role || "").toLowerCase();
const isAdmin = (req: Request) => role(req) === "admin";
const ids = (value: unknown) => String(value || "").split(",").map((v) => v.trim()).filter(Types.ObjectId.isValid);
const pageNumber = (value: unknown, fallback = 1) => Math.max(1, Math.floor(Number(value) || fallback));
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const hasCapabilityFilters = (query: Record<string, unknown>) => ["destinationCountryIds", "commodityIds", "qualityClassifications", "testIds", "parameterIds", "accreditationIds", "verifiedOnly"].some((key) => Boolean(query[key]) && query[key] !== "false");
const coordinates = (value: any) => {
  const latitude = Number(value?.location?.latitude ?? value?.pincodeEntry?.latitude);
  const longitude = Number(value?.location?.longitude ?? value?.pincodeEntry?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude, label: value?.location?.label || value?.pincodeEntry?.officename || "" } : undefined;
};
const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(bLat - aLat), dLng = radians(bLng - aLng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6378.1 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export function legacyProfile(company: any) {
  const location = coordinates(company);
  return {
    _id: `legacy-${company._id}`,
    companyId: { _id: company._id, name: company.name, isExternalDirectoryListing: company.isExternalDirectoryListing, externalListingSource: company.externalListingSource },
    status: "PUBLISHED",
    capabilityStatus: "LEGACY_REQUIRES_MAPPING",
    published: {
      displayName: company.labDisplayName || company.name || "Legacy lab",
      contactEmail: company.labContactEmail || company.email || "",
      contactPhone: company.labContactPhone || company.phone || "",
      contactPhoneSecondary: company.labContactPhoneSecondary || company.phoneSecondary || "",
      address: company.address || "Location not supplied",
      physicalCountryId: company.country || null,
      state: company.state || "",
      city: company.district || "",
      location,
      summary: company.labNotes || "Legacy lab listing awaiting structured capability mapping.",
      credentials: [], productCapabilityTemplates: [], countryAssignments: [],
      legacyCapabilities: { tests: company.labTests || [], certifications: company.labCertifications || [], specifications: company.labSpecifications || [], acceptedItems: company.labAcceptedItems || [], requiresMapping: true },
    },
  };
}

async function ownCompanyId(req: Request) {
  if (isAdmin(req)) {
    const requested = String(req.query.companyId || req.body?.companyId || "");
    return Types.ObjectId.isValid(requested) ? requested : null;
  }
  if (role(req) !== "associate" || !Types.ObjectId.isValid(String(req.user?.id || ""))) return null;
  const associate = await AssociateModel.findById(req.user!.id).select("associateCompany").lean();
  return String((associate as any)?.associateCompany || "") || null;
}

function normalizeSnapshot(raw: any) {
  const snapshot = { ...raw };
  const latitude = Number(snapshot?.location?.latitude);
  const longitude = Number(snapshot?.location?.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    snapshot.location = { ...snapshot.location, latitude, longitude, point: { type: "Point", coordinates: [longitude, latitude] } };
  } else if (snapshot.location) {
    const { point, ...location } = snapshot.location;
    snapshot.location = location;
  }
  snapshot.credentials = Array.isArray(snapshot.credentials) ? snapshot.credentials : [];
  snapshot.productCapabilityTemplates = Array.isArray(snapshot.productCapabilityTemplates) ? snapshot.productCapabilityTemplates : [];
  snapshot.countryAssignments = Array.isArray(snapshot.countryAssignments) ? snapshot.countryAssignments : [];
  snapshot.productCapabilityTemplates = snapshot.productCapabilityTemplates.map((item: any) => ({ ...item, _id: Types.ObjectId.isValid(String(item._id || "")) ? item._id : new Types.ObjectId() }));
  if (!snapshot.productCapabilityTemplates.length && Array.isArray(snapshot.offerings) && snapshot.offerings.length) {
    const grouped = new Map<string, any>();
    snapshot.offerings.forEach((item: any, index: number) => {
      const signature = JSON.stringify({ commodityId: String(item.commodityId || ""), qualityClassifications: [...(item.qualityClassifications || [])].sort(), testIds: item.testId ? [String(item.testId)] : [], parameterIds: [...(item.parameterIds || [])].map(String).sort(), credentialIds: [...(item.credentialIds || [])].map(String).sort(), method: item.method || "", turnaroundDays: item.turnaroundDays ?? null, sampleRequirements: item.sampleRequirements || "", notes: item.notes || "" });
      if (!grouped.has(signature)) grouped.set(signature, { _id: new Types.ObjectId(), name: `Imported product capability ${index + 1}`, commodityId: item.commodityId, qualityClassifications: item.qualityClassifications || [], testIds: item.testId ? [item.testId] : [], parameterIds: item.parameterIds || [], credentialIds: item.credentialIds || [], method: item.method || "", turnaroundDays: item.turnaroundDays ?? null, sampleRequirements: item.sampleRequirements || "", notes: item.notes || "", countryIds: new Set<string>() });
      (item.destinationCountryIds || []).forEach((countryId: unknown) => grouped.get(signature).countryIds.add(String(countryId)));
    });
    const assignments = new Map<string, Set<string>>();
    snapshot.productCapabilityTemplates = Array.from(grouped.values()).map((item: any) => {
      item.countryIds.forEach((countryId: string) => { if (!assignments.has(countryId)) assignments.set(countryId, new Set()); assignments.get(countryId)!.add(String(item._id)); });
      const { countryIds, ...template } = item;
      return template;
    });
    snapshot.countryAssignments = Array.from(assignments, ([countryId, templateIds]) => ({ countryId, productTemplateIds: Array.from(templateIds) }));
  }
  delete snapshot.offerings;
  return snapshot;
}

export function validateLabSnapshot(snapshot: any): string[] {
  const errors: string[] = [];
  const credentialAccreditationIds = new Set((snapshot?.credentials || []).filter((item: any) => item.verificationStatus !== "REJECTED").map((item: any) => String(item.accreditationId || "")));
  ["displayName", "contactEmail", "contactPhone", "address", "physicalCountryId"].forEach((key) => {
    if (!String(snapshot?.[key] || "").trim()) errors.push(`${key} is required`);
  });
  if (!snapshot.productCapabilityTemplates?.length) errors.push("At least one product capability is required");
  if (!snapshot.countryAssignments?.length) errors.push("At least one export country assignment is required");
  snapshot.credentials?.forEach((item: any, index: number) => {
    if (!Types.ObjectId.isValid(String(item.accreditationId || "")) || !String(item.issuer || "").trim()) {
      errors.push(`Credential ${index + 1} requires an accreditation and issuing body`);
    } else if (item.validFrom && item.validTo && new Date(item.validTo) < new Date(item.validFrom)) errors.push(`Credential ${index + 1} has invalid validity dates`);
  });
  const templateIds = new Set<string>();
  snapshot.productCapabilityTemplates?.forEach((item: any, index: number) => {
    if (!Types.ObjectId.isValid(String(item._id || ""))) errors.push(`Product capability ${index + 1} requires a stable identifier`);
    else templateIds.add(String(item._id));
    if (!Types.ObjectId.isValid(String(item.commodityId || ""))) errors.push(`Product capability ${index + 1} requires a commodity`);
    if ((item.credentialIds || []).some((value: unknown) => !credentialAccreditationIds.has(String(value)))) errors.push(`Product capability ${index + 1} references a missing or rejected credential`);
  });
  const assignedCountries = new Set<string>();
  snapshot.countryAssignments?.forEach((item: any, index: number) => {
    const countryId = String(item.countryId || "");
    if (!Types.ObjectId.isValid(countryId)) errors.push(`Country assignment ${index + 1} requires a country`);
    if (assignedCountries.has(countryId)) errors.push(`Country assignment ${index + 1} duplicates a country`);
    assignedCountries.add(countryId);
    if (!item.productTemplateIds?.length) errors.push(`Country assignment ${index + 1} requires at least one product`);
    if ((item.productTemplateIds || []).some((value: unknown) => !templateIds.has(String(value)))) errors.push(`Country assignment ${index + 1} references a missing product template`);
  });
  return errors;
}

export function buildLabOfferingFilter(query: Record<string, unknown>) {
  const offering: any = {};
  const mapping: Array<[string, string]> = [["commodityIds", "commodityId"], ["testIds", "testIds"], ["parameterIds", "parameterIds"], ["qualityClassifications", "qualityClassifications"]];
  mapping.forEach(([input, field]) => {
    const values = input === "qualityClassifications" ? String(query[input] || "").split(",").filter(Boolean) : ids(query[input]);
    if (values.length) offering[field] = field === "commodityId" ? { $in: values } : { $all: values };
  });
  const accreditationIds = ids(query.accreditationIds);
  if (accreditationIds.length) offering.credentialIds = { $all: accreditationIds };
  return offering;
}

function buildLinkedCountryTemplateExpression(query: Record<string, unknown>) {
  const destinationIds = ids(query.destinationCountryIds).map((value) => new Types.ObjectId(value));
  const commodityIds = ids(query.commodityIds).map((value) => new Types.ObjectId(value));
  const testIds = ids(query.testIds).map((value) => new Types.ObjectId(value));
  const parameterIds = ids(query.parameterIds).map((value) => new Types.ObjectId(value));
  const credentialIds = ids(query.accreditationIds).map((value) => new Types.ObjectId(value));
  const classifications = String(query.qualityClassifications || "").split(",").filter(Boolean);
  const templateConditions: any[] = [];
  if (commodityIds.length) templateConditions.push({ $in: ["$$template.commodityId", commodityIds] });
  if (testIds.length) templateConditions.push({ $setIsSubset: [testIds, { $ifNull: ["$$template.testIds", []] }] });
  if (parameterIds.length) templateConditions.push({ $setIsSubset: [parameterIds, { $ifNull: ["$$template.parameterIds", []] }] });
  if (credentialIds.length) templateConditions.push({ $setIsSubset: [credentialIds, { $ifNull: ["$$template.credentialIds", []] }] });
  if (classifications.length) templateConditions.push({ $setIsSubset: [classifications, { $ifNull: ["$$template.qualityClassifications", []] }] });
  if (!destinationIds.length || !templateConditions.length) return null;
  const matchingTemplateIds = {
    $map: {
      input: { $filter: { input: "$published.productCapabilityTemplates", as: "template", cond: { $and: templateConditions } } },
      as: "matchedTemplate",
      in: "$$matchedTemplate._id",
    },
  };
  return {
    $gt: [{ $size: { $filter: { input: "$published.countryAssignments", as: "assignment", cond: { $and: [
      { $in: ["$$assignment.countryId", destinationIds] },
      { $gt: [{ $size: { $setIntersection: [{ $ifNull: ["$$assignment.productTemplateIds", []] }, matchingTemplateIds] } }, 0] },
    ] } } } }, 0],
  };
}

const populateProfile = (query: any, path = "published") => query
  .populate(`${path}.physicalCountryId`, "name")
  .populate(`${path}.credentials.accreditationId`, "name kind")
  .populate(`${path}.productCapabilityTemplates.commodityId`, "name kind")
  .populate(`${path}.productCapabilityTemplates.testIds`, "name kind")
  .populate(`${path}.productCapabilityTemplates.parameterIds`, "name unit method kind")
  .populate(`${path}.countryAssignments.countryId`, "name");

export class LabProfileController {
  async taxonomy(req: Request, res: Response) {
    const filter: any = { isDeleted: { $ne: true }, status: "ACTIVE" };
    if (req.query.kind) filter.kind = String(req.query.kind).toUpperCase();
    const [items, countries] = await Promise.all([
      LabTaxonomyModel.find(filter).sort({ kind: 1, name: 1 }).lean(),
      CountryModel.find({ isDeleted: { $ne: true } }).select("name").sort({ name: 1 }).lean(),
    ]);
    return res.json({ success: true, data: { items, countries, qualityClassifications: ["ORGANIC", "CONVENTIONAL", "IPM"] } });
  }

  async requestTaxonomy(req: Request, res: Response) {
    const companyId = await ownCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, message: "Only a lab owner or admin can add an option." });
    const kind = String(req.body?.kind || "").toUpperCase();
    const name = String(req.body?.name || "").trim();
    if (!(LAB_TAXONOMY_KINDS as readonly string[]).includes(kind) || !name) return res.status(400).json({ success: false, message: "Valid kind and name are required." });
    const existing = await LabTaxonomyModel.findOne({ kind, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), isDeleted: { $ne: true } });
    if (existing) {
      existing.status = "ACTIVE";
      existing.isDeleted = false;
      ids(req.body?.parentIds).forEach((parentId) => { if (!existing.parentIds.some((id) => String(id) === parentId)) existing.parentIds.push(new Types.ObjectId(parentId)); });
      await existing.save();
      return res.json({ success: true, data: existing, existing: true });
    }
    const item = await LabTaxonomyModel.create({ kind, name, description: req.body?.description, unit: req.body?.unit, method: req.body?.method, parentIds: ids(req.body?.parentIds), status: "ACTIVE", requestedByCompany: companyId, requestedBy: req.user?.id });
    return res.status(201).json({ success: true, data: item, existing: false });
  }

  async adminTaxonomy(req: Request, res: Response) {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
    const status = String(req.query.status || "").toUpperCase();
    const query: any = { isDeleted: { $ne: true } };
    if (status) query.status = status;
    return res.json({ success: true, data: await LabTaxonomyModel.find(query).sort({ createdAt: -1 }).lean() });
  }

  async createTaxonomy(req: Request, res: Response) {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
    const kind = String(req.body?.kind || "").toUpperCase();
    const name = String(req.body?.name || "").trim();
    if (!(LAB_TAXONOMY_KINDS as readonly string[]).includes(kind) || !name) return res.status(400).json({ success: false, message: "Valid kind and name are required." });
    const item = await LabTaxonomyModel.create({ ...req.body, kind, name, status: "ACTIVE" });
    return res.status(201).json({ success: true, data: item });
  }

  async reviewTaxonomy(req: Request, res: Response) {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
    const action = String(req.body?.action || "").toUpperCase();
    if (!action) {
      const allowed: any = {};
      ["name", "description", "unit", "method", "parentIds"].forEach((key) => { if (req.body?.[key] !== undefined) allowed[key] = key === "parentIds" ? ids(req.body[key]) : req.body[key]; });
      const updated = await LabTaxonomyModel.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true, runValidators: true });
      return updated ? res.json({ success: true, data: updated }) : res.status(404).json({ success: false, message: "Option not found." });
    }
    if (!["APPROVE", "REJECT", "DEACTIVATE"].includes(action)) return res.status(400).json({ success: false, message: "Invalid action." });
    const status = action === "APPROVE" ? "ACTIVE" : action === "REJECT" ? "REJECTED" : "INACTIVE";
    const item = await LabTaxonomyModel.findByIdAndUpdate(req.params.id, { $set: { status, reviewNotes: String(req.body?.notes || "") } }, { new: true });
    return item ? res.json({ success: true, data: item }) : res.status(404).json({ success: false, message: "Option not found." });
  }

  async deleteTaxonomy(req: Request, res: Response) {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
    const item = await LabTaxonomyModel.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true, status: "INACTIVE" } }, { new: true });
    return item ? res.json({ success: true }) : res.status(404).json({ success: false, message: "Option not found." });
  }

  async getDraft(req: Request, res: Response) {
    const companyId = await ownCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, message: "Lab owner or admin access required." });
    const profile = await populateProfile(LabProfileModel.findOne({ companyId }), "draft").lean();
    return res.json({ success: true, data: profile });
  }

  async saveDraft(req: Request, res: Response) {
    const companyId = await ownCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, message: "Lab owner or admin access required." });
    const draft = normalizeSnapshot(req.body?.profile || req.body);
    const company = await AssociateCompanyModel.findById(companyId).select("_id").lean();
    if (!company) return res.status(404).json({ success: false, message: "Associate company not found." });
    const current = await LabProfileModel.findOne({ companyId }).select("status published").lean();
    if (current?.status === "PENDING_REVIEW") return res.status(409).json({ success: false, message: "This profile is under review and cannot be changed until a decision is made." });
    const status = "DRAFT";
    const profile = await LabProfileModel.findOneAndUpdate({ companyId }, { $set: { draft, status }, $setOnInsert: { companyId } }, { new: true, upsert: true, runValidators: false });
    return res.json({ success: true, data: profile });
  }

  async submit(req: Request, res: Response) {
    const companyId = await ownCompanyId(req);
    if (!companyId) return res.status(403).json({ success: false, message: "Lab owner or admin access required." });
    const profile: any = await LabProfileModel.findOne({ companyId });
    if (!profile?.draft) return res.status(400).json({ success: false, message: "Save a draft before submitting." });
    const errors = validateLabSnapshot(profile.draft.toObject());
    if (errors.length) return res.status(400).json({ success: false, message: errors.join("; "), errors });
    profile.status = "PENDING_REVIEW";
    profile.submittedAt = new Date();
    profile.reviewNotes = "";
    await profile.save();
    return res.json({ success: true, data: profile });
  }

  async approvals(req: Request, res: Response) {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
    const status = String(req.query.status || "PENDING_REVIEW").toUpperCase();
    const rows = await populateProfile(populateProfile(LabProfileModel.find({ status }).populate("companyId", "name email"), "draft"), "published").sort({ submittedAt: -1 }).lean();
    return res.json({ success: true, data: rows });
  }

  async review(req: Request, res: Response) {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
    const action = String(req.body?.action || "").toUpperCase();
    const profile: any = await LabProfileModel.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: "Lab profile not found." });
    if (action === "APPROVE") {
      const errors = validateLabSnapshot(profile.draft?.toObject?.() || profile.draft);
      if (errors.length) return res.status(400).json({ success: false, message: errors.join("; "), errors });
      const verifiedCredentialIds = new Set(ids(req.body?.verifiedCredentialIds));
      profile.draft.credentials.forEach((item: any) => {
        if (verifiedCredentialIds.has(String(item._id)) && item.documentUrl) item.verificationStatus = "VERIFIED";
        else if (item.verificationStatus !== "REJECTED") item.verificationStatus = "PENDING";
      });
      profile.published = profile.draft.toObject();
      profile.status = "PUBLISHED";
      profile.publishedAt = new Date();
      await AssociateCompanyModel.findByIdAndUpdate(profile.companyId, { $set: { isQualityLabListed: true, labListingState: "LIVE" } });
    } else if (action === "REJECT") {
      profile.status = "REJECTED";
    } else return res.status(400).json({ success: false, message: "Action must be APPROVE or REJECT." });
    profile.reviewNotes = String(req.body?.notes || "");
    profile.reviewedBy = req.user?.id;
    await profile.save();
    return res.json({ success: true, data: profile });
  }

  async directory(req: Request, res: Response) {
    const page = pageNumber(req.query.page);
    const limit = Math.min(100, pageNumber(req.query.limit, 20));
    const query: any = { published: { $ne: null } };
    const search = String(req.query.search || "").trim();
    if (search) query.$text = { $search: search };
    const physicalCountryIds = ids(req.query.physicalCountryIds);
    if (physicalCountryIds.length) query["published.physicalCountryId"] = { $in: physicalCountryIds };
    if (req.query.state) query["published.state"] = new RegExp(String(req.query.state), "i");
    if (req.query.city) query["published.city"] = new RegExp(String(req.query.city), "i");
    const offering: any = buildLabOfferingFilter(req.query as Record<string, unknown>);
    const destinationCountryIds = ids(req.query.destinationCountryIds);
    const linkedExpression = buildLinkedCountryTemplateExpression(req.query as Record<string, unknown>);
    if (linkedExpression) query.$expr = linkedExpression;
    else {
      if (Object.keys(offering).length) query["published.productCapabilityTemplates"] = { $elemMatch: offering };
      if (destinationCountryIds.length) query["published.countryAssignments.countryId"] = { $in: destinationCountryIds };
    }
    const accreditationIds = ids(req.query.accreditationIds);
    if (accreditationIds.length || String(req.query.verifiedOnly) === "true") {
      const credential: any = {};
      if (accreditationIds.length) credential.accreditationId = { $in: accreditationIds };
      if (String(req.query.verifiedOnly) === "true") { credential.verificationStatus = "VERIFIED"; credential.$or = [{ validTo: null }, { validTo: { $exists: false } }, { validTo: { $gte: new Date() } }]; }
      query["published.credentials"] = { $elemMatch: credential };
    }
    const source = String(req.query.source || "");
    if (source) {
      const sourceCompanyIds = await AssociateCompanyModel.distinct("_id", { externalListingSource: source, isDeleted: { $ne: true } });
      query.companyId = { $in: sourceCompanyIds };
    }
    const lat = Number(req.query.latitude), lng = Number(req.query.longitude), radiusKm = Number(req.query.radiusKm);
    if (Number.isFinite(lat) && Number.isFinite(lng) && radiusKm > 0) query["published.location.point"] = { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] } };
    const structured: any[] = await populateProfile(LabProfileModel.find(query)).populate("companyId", "name isExternalDirectoryListing externalListingSource").lean();
    const structuredCompanyIds = new Set(structured.map((row: any) => String(row.companyId?._id || row.companyId)));
    let legacy: any[] = [];
    if (!hasCapabilityFilters(req.query as Record<string, unknown>)) {
      const legacyQuery: any = { isDeleted: { $ne: true }, isQualityLabListed: true, labListingState: "LIVE", _id: { $nin: Array.from(structuredCompanyIds) } };
      if (physicalCountryIds.length) legacyQuery.country = { $in: physicalCountryIds };
      if (source) legacyQuery.externalListingSource = source;
      if (search) legacyQuery.$or = ["name", "labDisplayName", "address", "labNotes", "labTests", "labCertifications", "labAcceptedItems"].map((field) => ({ [field]: new RegExp(escaped(search), "i") }));
      const companies: any[] = await AssociateCompanyModel.find(legacyQuery)
        .select("name email phone phoneSecondary address country state district location pincodeEntry labDisplayName labContactEmail labContactPhone labContactPhoneSecondary labTests labCertifications labSpecifications labAcceptedItems labNotes isExternalDirectoryListing externalListingSource")
        .populate("country", "name").populate("state", "name").populate("district", "name").populate("pincodeEntry", "latitude longitude officename").lean();
      const stateText = String(req.query.state || "").toLowerCase(), cityText = String(req.query.city || "").toLowerCase();
      legacy = companies.filter((company) => {
        if (stateText && !String(company.state?.name || company.state || "").toLowerCase().includes(stateText)) return false;
        if (cityText && !String(company.district?.name || company.district || "").toLowerCase().includes(cityText)) return false;
        if (!(Number.isFinite(lat) && Number.isFinite(lng) && radiusKm > 0)) return true;
        const point = coordinates(company);
        return Boolean(point && distanceKm(lat, lng, point.latitude, point.longitude) <= radiusKm);
      }).map(legacyProfile);
    }
    const allRows = [...structured.map((row: any) => ({ ...row, capabilityStatus: row.published?.legacyCapabilities?.requiresMapping ? "LEGACY_REQUIRES_MAPPING" : "STRUCTURED" })), ...legacy]
      .sort((a: any, b: any) => String(a.published?.displayName || "").localeCompare(String(b.published?.displayName || "")));
    const total = allRows.length;
    const rows = allRows.slice((page - 1) * limit, page * limit);
    const markers = allRows.flatMap((row: any) => {
      const point = coordinates(row.published);
      return point ? [{ _id: row._id, name: row.published.displayName, contactPhone: row.published.contactPhone, location: point, capabilityStatus: row.capabilityStatus, source: row.companyId?.externalListingSource || "" }] : [];
    });
    const [active, countries, countryCounts, productCounts] = await Promise.all([
      LabTaxonomyModel.find({ status: "ACTIVE", isDeleted: { $ne: true } }).select("kind name unit method parentIds").sort({ name: 1 }).lean(),
      CountryModel.find({ isDeleted: { $ne: true } }).select("name").sort({ name: 1 }).lean(),
      LabProfileModel.aggregate([{ $match: { published: { $ne: null } } }, { $unwind: "$published.countryAssignments" }, { $group: { _id: "$published.countryAssignments.countryId", count: { $sum: 1 } } }]),
      LabProfileModel.aggregate([{ $match: { published: { $ne: null } } }, { $unwind: "$published.productCapabilityTemplates" }, { $group: { _id: "$published.productCapabilityTemplates.commodityId", count: { $sum: 1 } } }]),
    ]);
    return res.json({ success: true, data: rows, markers, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 }, facets: { taxonomy: active, countries, qualityClassifications: ["ORGANIC", "CONVENTIONAL", "IPM"], counts: { countries: Object.fromEntries(countryCounts.map((item) => [String(item._id), item.count])), products: Object.fromEntries(productCounts.map((item) => [String(item._id), item.count])) } } });
  }

  async detail(req: Request, res: Response) {
    const profile = await populateProfile(LabProfileModel.findById(req.params.id).populate("companyId", "name isExternalDirectoryListing externalListingSource")).lean();
    return profile?.published ? res.json({ success: true, data: profile }) : res.status(404).json({ success: false, message: "Published lab not found." });
  }
}

