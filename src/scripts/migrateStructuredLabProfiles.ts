import mongoose from "mongoose";
import { MONGODB_URI } from "../config";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { LabProfileModel } from "../database/models/labProfile";

function countryFirst(snapshot: any) {
  if (!snapshot || snapshot.productCapabilityTemplates?.length || !snapshot.offerings?.length) return snapshot;
  const grouped = new Map<string, any>();
  snapshot.offerings.forEach((offering: any, index: number) => {
    const signature = JSON.stringify({ commodityId: String(offering.commodityId || ""), qualityClassifications: [...(offering.qualityClassifications || [])].sort(), testIds: offering.testId ? [String(offering.testId)] : [], parameterIds: [...(offering.parameterIds || [])].map(String).sort(), credentialIds: [...(offering.credentialIds || [])].map(String).sort(), method: offering.method || "", turnaroundDays: offering.turnaroundDays ?? null, sampleRequirements: offering.sampleRequirements || "", notes: offering.notes || "" });
    if (!grouped.has(signature)) grouped.set(signature, { _id: new mongoose.Types.ObjectId(), name: `Imported ${String(offering.commodityId || "product")} ${index + 1}`, commodityId: offering.commodityId, qualityClassifications: offering.qualityClassifications || [], testIds: offering.testId ? [offering.testId] : [], parameterIds: offering.parameterIds || [], credentialIds: offering.credentialIds || [], method: offering.method || "", turnaroundDays: offering.turnaroundDays ?? null, sampleRequirements: offering.sampleRequirements || "", notes: offering.notes || "", countries: new Set<string>() });
    (offering.destinationCountryIds || []).forEach((countryId: unknown) => grouped.get(signature).countries.add(String(countryId)));
  });
  const assignmentMap = new Map<string, Set<string>>();
  const productCapabilityTemplates = Array.from(grouped.values()).map((entry: any) => {
    entry.countries.forEach((countryId: string) => { if (!assignmentMap.has(countryId)) assignmentMap.set(countryId, new Set()); assignmentMap.get(countryId)!.add(String(entry._id)); });
    const { countries, ...template } = entry;
    return template;
  });
  const countryAssignments = Array.from(assignmentMap, ([countryId, productTemplateIds]) => ({ countryId: new mongoose.Types.ObjectId(countryId), productTemplateIds: Array.from(productTemplateIds, (value) => new mongoose.Types.ObjectId(value)) }));
  const { offerings, ...rest } = snapshot;
  return { ...rest, productCapabilityTemplates, countryAssignments };
}

async function run() {
  await mongoose.connect(MONGODB_URI as string);
  const collection = mongoose.connection.collection("labprofiles");
  const existingProfiles: any[] = await collection.find({ $or: [{ "draft.offerings.0": { $exists: true } }, { "published.offerings.0": { $exists: true } }] }).toArray();
  for (const profile of existingProfiles) {
    await collection.updateOne({ _id: profile._id }, { $set: { draft: countryFirst(profile.draft), published: countryFirst(profile.published), updatedAt: new Date() } });
  }
  const companies: any[] = await AssociateCompanyModel.find({ isQualityLabListed: true, labListingState: "LIVE", isDeleted: { $ne: true } })
    .select("name email phone phoneSecondary address country state district location pincodeEntry labDisplayName labContactEmail labContactPhone labContactPhoneSecondary labTests labCertifications labSpecifications labAcceptedItems labNotes isExternalDirectoryListing externalListingSource externalListingSourceUrl externalListingReference externalListingDate")
    .populate("pincodeEntry", "latitude longitude officename")
    .lean();
  let migrated = 0;
  for (const company of companies) {
    const existing = await LabProfileModel.exists({ companyId: company._id });
    if (existing) continue;
    const latitude = Number(company.location?.latitude ?? company.pincodeEntry?.latitude), longitude = Number(company.location?.longitude ?? company.pincodeEntry?.longitude);
    const snapshot: any = {
      displayName: company.labDisplayName || company.name || "Legacy lab",
      contactEmail: company.labContactEmail || company.email || "",
      contactPhone: company.labContactPhone || company.phone || "",
      whatsappPhone: company.labWhatsappPhone || "",
      contactPhoneSecondary: company.labContactPhoneSecondary || company.phoneSecondary || "",
      address: company.address || "Location not supplied",
      physicalCountryId: company.country || undefined,
      state: String(company.state || ""), city: String(company.district || ""),
      summary: company.labNotes || "Imported legacy lab profile; structured capability mapping requires review.",
      credentials: [], productCapabilityTemplates: [], countryAssignments: [],
      legacyCapabilities: { tests: company.labTests || [], certifications: company.labCertifications || [], specifications: company.labSpecifications || [], acceptedItems: company.labAcceptedItems || [], requiresMapping: true },
    };
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) snapshot.location = { latitude, longitude, label: company.location?.label || company.pincodeEntry?.officename || "", point: { type: "Point", coordinates: [longitude, latitude] } };
    await LabProfileModel.collection.updateOne({ companyId: company._id }, { $setOnInsert: { companyId: company._id, published: snapshot, draft: snapshot, status: "PUBLISHED", publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
    migrated += 1;
  }
  console.log(`Converted ${existingProfiles.length} structured profile(s) and migrated ${migrated} legacy quality lab profile(s).`);
  await mongoose.disconnect();
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
