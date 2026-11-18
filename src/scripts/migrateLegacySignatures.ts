import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { SignatureModel } from "../database/models/signature";
import { getObjectBuffer, putObject } from "../services/objectStorageService";
import { MONGODB_URI } from "../config";

async function run() {
  await mongoose.connect(MONGODB_URI as string);
  const companies: any[] = await AssociateCompanyModel.find({ $or: [{ "documentSignature.objectKey": { $ne: "" } }, { "documentSignature.imageDataUrl": /^data:image\// }] }).select("documentSignature name");
  let migrated = 0, skipped = 0;
  for (const company of companies) {
    const legacy = company.documentSignature;
    if (await SignatureModel.exists({ ownerType: "COMPANY", companyId: company._id, legacyCompanySignature: true })) { skipped += 1; continue; }
    let objectKey = String(legacy.objectKey || ""), buffer: Buffer;
    if (objectKey) buffer = await getObjectBuffer(objectKey);
    else { const match = String(legacy.imageDataUrl || "").match(/^data:image\/[^;]+;base64,(.+)$/); if (!match) { skipped += 1; continue; } buffer = Buffer.from(match[1], "base64"); }
    const stored = objectKey ? { objectKey, checksum: String(legacy.checksum || "") || (await import("crypto")).createHash("sha256").update(buffer).digest("hex"), size: buffer.length } : await putObject({ domain: "signatures/company", body: buffer, originalName: "signature.png", mimeType: "image/png", metadata: { companyId: String(company._id), migrated: "true" } });
    await SignatureModel.create({ ownerType: "COMPANY", companyId: company._id, ownerUserId: null, ownerRole: "Associate", signerName: String(legacy.signerName || company.name || "Authorized signatory"), signerDesignation: String(legacy.signerDesignation || ""), status: "PENDING_VERIFICATION", version: 1, objectKey: stored.objectKey, checksum: stored.checksum, size: stored.size, mimeType: "image/png", originalFileName: String(legacy.originalFileName || "signature.png"), registeredAt: legacy.updatedAt || new Date(), legacyCompanySignature: true });
    company.documentSignature = undefined; await company.save(); migrated += 1;
  }
  console.info(JSON.stringify({ migrated, skipped, total: companies.length }));
  await mongoose.disconnect();
}
run().catch(async error => { console.error(error); await mongoose.disconnect().catch(() => undefined); process.exit(1); });
