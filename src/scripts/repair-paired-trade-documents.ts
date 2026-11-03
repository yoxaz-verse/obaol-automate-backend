import dotenv from "dotenv";
import mongoose from "mongoose";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";
import { resolveObaolCompany } from "../utils/obaolCompanyConfig";

dotenv.config();

const directions: Record<string, [string, string]> = {
  LOI: ["BUYER_TO_OBAOL", "OBAOL_TO_SELLER"],
  PURCHASE_ORDER: ["BUYER_TO_OBAOL", "OBAOL_TO_SELLER"],
  QUOTATION: ["SELLER_TO_OBAOL", "OBAOL_TO_BUYER"],
  PROFORMA_INVOICE: ["SELLER_TO_OBAOL", "OBAOL_TO_BUYER"],
};
const scopeFor = (direction: string) => ["BUYER_TO_OBAOL", "OBAOL_TO_BUYER"].includes(direction) ? "OBAOL_BUYER" : "SELLER_OBAOL";
const directionFor = (type: string, scope: string) => directions[type].find(direction => scopeFor(direction) === scope)!;
const fill = (current: any, source: any) => {
  const next = { ...(current || {}) };
  for (const key of ["name", "contactName", "email", "phone", "address", "gstin", "logo"]) if (!String(next[key] || "").trim() && source?.[key]) next[key] = source[key];
  if (!next.companyId && source?.companyId) next.companyId = source.companyId;
  if (!next.associateId && source?.associateId) next.associateId = source.associateId;
  return next;
};

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI is missing.");
  await mongoose.connect(uri);
  const obaol = await resolveObaolCompany();
  if (!obaol.companyId || !obaol.company) throw new Error("OBAOL company configuration is missing or invalid.");
  const obaolParty = { companyId: obaol.companyId, name: obaol.company.name, email: obaol.company.email, phone: obaol.company.phone, address: obaol.company.address, gstin: obaol.company.gstin, logo: obaol.company.logo };
  const contexts = await TradeDocumentModel.aggregate([
    { $match: { type: { $in: Object.keys(directions) }, isDeleted: { $ne: true }, $or: [{ enquiryId: { $type: "objectId" } }, { orderId: { $type: "objectId" } }] } },
    { $group: { _id: { orderId: "$orderId", enquiryId: "$enquiryId", type: "$type" } } },
  ]);
  let repaired = 0, created = 0;
  for (const context of contexts) {
    const linkedOrder: any = context._id.orderId ? await OrderModel.findById(context._id.orderId).select("enquiry").lean() : null;
    const enquiryId = context._id.enquiryId || linkedOrder?.enquiry;
    const enquiry: any = enquiryId ? await InquiryModel.findById(enquiryId).populate([
      { path: "buyerAssociateId", select: "name email phone associateCompany", populate: { path: "associateCompany", select: "name email phone address gstin logo" } },
      { path: "sellerAssociateId", select: "name email phone associateCompany", populate: { path: "associateCompany", select: "name email phone address gstin logo" } },
    ]).lean() : null;
    if (!enquiry) continue;
    const party = (associate: any) => ({ associateId: associate?._id, companyId: associate?.associateCompany?._id, name: associate?.associateCompany?.name || associate?.name, contactName: associate?.name, email: associate?.associateCompany?.email || associate?.email, phone: associate?.associateCompany?.phone || associate?.phone, address: associate?.associateCompany?.address, gstin: associate?.associateCompany?.gstin, logo: associate?.associateCompany?.logo });
    const buyer = party(enquiry.buyerAssociateId), seller = party(enquiry.sellerAssociateId);
    const type = String(context._id.type), pairGroupId = `${context._id.orderId ? `order:${context._id.orderId}` : `enquiry:${enquiryId}`}:${type}`;
    const contextFilter = context._id.orderId ? { orderId: context._id.orderId } : { enquiryId };
    const rows: any[] = await TradeDocumentModel.find({ ...contextFilter, type, isDeleted: { $ne: true } }).sort({ createdAt: 1 });
    const claimedDirections = new Set<string>();
    for (const row of rows) {
      const direction = row.direction || directionFor(type, String(row.audienceScope || "SELLER_OBAOL"));
      row.direction = direction; row.pairGroupId = pairGroupId;
      if (!row.revisionOf && !claimedDirections.has(direction)) { row.pairLegKey = `${pairGroupId}:${direction}`; claimedDirections.add(direction); }
      else row.pairLegKey = null;
      row.buyer = fill(row.buyer, ["BUYER_TO_OBAOL", "OBAOL_TO_BUYER"].includes(direction) ? buyer : obaolParty);
      row.seller = fill(row.seller, ["BUYER_TO_OBAOL", "OBAOL_TO_BUYER"].includes(direction) ? obaolParty : seller);
      await row.save(); repaired += 1;
    }
    const refreshed: any[] = await TradeDocumentModel.find({ ...contextFilter, type, isDeleted: { $ne: true } });
    for (const direction of directions[type]) {
      if (refreshed.some(row => row.direction === direction)) continue;
      const source: any = refreshed[0]; if (!source) continue;
      const buyerSide = ["BUYER_TO_OBAOL", "OBAOL_TO_BUYER"].includes(direction);
      const issuerCompanyId = direction === "SELLER_TO_OBAOL" ? seller.companyId : direction === "BUYER_TO_OBAOL" ? buyer.companyId : obaol.companyId;
      const issuerCompany: any = issuerCompanyId ? await AssociateCompanyModel.findById(issuerCompanyId).lean() : null;
      await TradeDocumentModel.create({ ...source.toObject(), _id: undefined, createdAt: undefined, updatedAt: undefined, documentNumber: `${String(source.documentNumber)}-${direction.split("_").map((word: string) => word[0]).join("")}`, ownerCompanyId: issuerCompany?._id || obaol.companyId, buyer: buyerSide ? buyer : obaolParty, seller: buyerSide ? obaolParty : seller, audienceScope: scopeFor(direction), pairGroupId, pairLegKey: `${pairGroupId}:${direction}`, direction, auditEvents: [{ action: "PAIR_LEG_BACKFILLED", actorRole: "system", metadata: { sourceDocumentId: source._id } }] });
      created += 1;
    }
  }
  console.log(`Paired documents repaired: ${repaired}; counterpart documents created: ${created}`);
  await mongoose.disconnect();
}

run().catch(async error => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
