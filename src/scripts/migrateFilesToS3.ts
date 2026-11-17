import "../config";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { MONGODB_URI } from "../config";
import FileModel from "../database/models/file";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { InlandTripModel } from "../database/models/inlandTransportation";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { DocumentExtractionJobModel } from "../database/models/documentExtractionJob";
import { headObject, putObject, storageConfiguration } from "../services/objectStorageService";

const apply = process.argv.includes("--apply");
const stats = { discovered: 0, migrated: 0, alreadyMigrated: 0, missing: 0, failed: 0 };
const exists = async (filePath: string) => fs.stat(filePath).then(s => s.isFile()).catch(() => false);
const uploadPath = async (domain: string, filePath: string, name: string, mimeType: string) => putObject({ domain, body: await fs.readFile(filePath), originalName: name, mimeType });

async function migrateFiles() {
  const rows: any[] = await FileModel.find({ objectKey: { $in: [null, ""] } });
  for (const row of rows) { stats.discovered++; try {
    if (!row.path || !await exists(path.resolve(row.path))) { stats.missing++; continue; }
    if (!apply) continue;
    const stored = await uploadPath(row.mimeType?.startsWith("image/") ? "images" : "files", path.resolve(row.path), row.fileName, row.mimeType);
    await headObject(stored.objectKey); row.set({ ...stored, url: `/v1/web/upload/${row._id}` }); await row.save(); stats.migrated++;
  } catch (error) { stats.failed++; console.error("file", row._id, error); } }
}

async function migrateSignatures() {
  const companies: any[] = await AssociateCompanyModel.find({ "documentSignature.imageDataUrl": /^data:image\//, "documentSignature.objectKey": { $in: [null, ""] } });
  for (const company of companies) { stats.discovered++; try {
    const match = String(company.documentSignature.imageDataUrl).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!match) { stats.missing++; continue; } if (!apply) continue;
    const stored = await putObject({ domain: "signatures", body: Buffer.from(match[2], "base64"), originalName: "signature.png", mimeType: match[1], metadata: { companyId: String(company._id) } });
    await headObject(stored.objectKey); company.documentSignature.storageProvider = "s3"; company.documentSignature.objectKey = stored.objectKey; company.documentSignature.checksum = stored.checksum; company.documentSignature.imageDataUrl = ""; await company.save(); stats.migrated++;
  } catch (error) { stats.failed++; console.error("signature", company._id, error); } }
}

async function migrateTransport() {
  const trips: any[] = await InlandTripModel.find({ "attachments.storageName": { $ne: "" }, "attachments.objectKey": { $in: [null, ""] } });
  const root = path.resolve(process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), "private-uploads", "documents"));
  for (const trip of trips) for (const item of trip.attachments) if (!item.objectKey && item.storageName) { stats.discovered++; try {
    const source = path.resolve(root, item.storageName); if (!source.startsWith(`${root}${path.sep}`) || !await exists(source)) { stats.missing++; continue; } if (!apply) continue;
    const stored = await uploadPath("transport", source, item.name, item.mimeType); await headObject(stored.objectKey); item.objectKey = stored.objectKey; item.checksum = stored.checksum; item.storageProvider = "s3"; await trip.save(); stats.migrated++;
  } catch (error) { stats.failed++; console.error("transport", trip._id, item._id, error); } }
}

async function migrateTradeDocuments() {
  const docs: any[] = await TradeDocumentModel.find({ sourceMode: "UPLOADED", objectKey: { $in: [null, ""] }, extractionJobId: { $ne: null } });
  for (const doc of docs) { stats.discovered++; try {
    const job: any = await DocumentExtractionJobModel.findById(doc.extractionJobId).select("+filePath +objectKey");
    if (job?.objectKey) { stats.alreadyMigrated++; if (apply) { doc.objectKey = job.objectKey; doc.storageProvider = "s3"; await doc.save(); } continue; }
    if (!job?.filePath || !await exists(path.resolve(job.filePath))) { stats.missing++; continue; } if (!apply) continue;
    const stored = await uploadPath("trade-documents", path.resolve(job.filePath), doc.originalFileName || "document", doc.fileMimeType); await headObject(stored.objectKey);
    doc.objectKey = stored.objectKey; doc.fileChecksum = stored.checksum; doc.storageProvider = "s3"; job.objectKey = stored.objectKey; await Promise.all([doc.save(), job.save()]); stats.migrated++;
  } catch (error) { stats.failed++; console.error("trade-document", doc._id, error); } }
}

async function main() {
  if (!storageConfiguration().configured) throw new Error("Set AWS_REGION and AWS_S3_BUCKET before running the migration.");
  await mongoose.connect(MONGODB_URI); await migrateFiles(); await migrateSignatures(); await migrateTransport(); await migrateTradeDocuments();
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...stats }, null, 2));
  await mongoose.disconnect(); if (stats.failed) process.exitCode = 1;
}
main().catch(async error => { console.error(error); await mongoose.disconnect().catch(() => undefined); process.exitCode = 1; });
