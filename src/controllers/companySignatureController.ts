import { Request, Response, NextFunction } from "express";
import sharp from "sharp";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { resolveObaolCompany } from "../utils/obaolCompanyConfig";
import { deleteObject, getObjectBuffer, putObject } from "../services/objectStorageService";

const signatureDataUrl = async (value: any) => value?.imageDataUrl || (value?.objectKey ? `data:image/png;base64,${(await getObjectBuffer(value.objectKey)).toString("base64")}` : "");
const publicSignature = async (value: any) => (value?.imageDataUrl || value?.objectKey) ? {
  imageDataUrl: await signatureDataUrl(value),
  originalFileName: value.originalFileName || "",
  signerName: value.signerName || "",
  signerDesignation: value.signerDesignation || "",
  updatedAt: value.updatedAt || null,
} : null;

const ownCompany = async (req: Request) => {
  const associate: any = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
  if (!associate?.associateCompany) throw Object.assign(new Error("A verified company account is required."), { statusCode: 403 });
  const company: any = await AssociateCompanyModel.findOne({ _id: associate.associateCompany, registrationStatus: "APPROVED", isDeleted: { $ne: true } });
  if (!company) throw Object.assign(new Error("Company verification is required."), { statusCode: 403 });
  return company;
};

const targetCompany = async (req: Request, obaol: boolean) => {
  if (!obaol) return ownCompany(req);
  if (String(req.user?.role || "").toLowerCase() !== "admin") throw Object.assign(new Error("Admin access required."), { statusCode: 403 });
  const resolved = await resolveObaolCompany();
  if (resolved.status !== "CONFIGURED" || !resolved.companyId) throw Object.assign(new Error("Configure the OBAOL company first."), { statusCode: 409 });
  const company = await AssociateCompanyModel.findById(resolved.companyId);
  if (!company) throw Object.assign(new Error("Configured OBAOL company was not found."), { statusCode: 404 });
  return company;
};

export const processSignatureImage = async (file: Express.Multer.File) => {
  if (!file || !["image/png", "image/jpeg"].includes(file.mimetype)) throw Object.assign(new Error("Upload a PNG or JPG signature."), { statusCode: 400 });
  const source = sharp(file.buffer, { failOn: "error", limitInputPixels: 20_000_000 }).rotate();
  const metadata = await source.metadata();
  if (!metadata.width || !metadata.height || metadata.width < 20 || metadata.height < 10) throw Object.assign(new Error("Signature image is too small."), { statusCode: 400 });
  const { data, info } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const r = data[offset], g = data[offset + 1], b = data[offset + 2];
    const lightness = Math.min(r, g, b);
    if (lightness >= 235) data[offset + 3] = Math.round(255 * (255 - lightness) / 20);
  }
  const output = await sharp(data, { raw: info }).trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } }).resize({ width: 1200, height: 400, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  if (output.length > 1_500_000) throw Object.assign(new Error("Processed signature is too large."), { statusCode: 400 });
  return `data:image/png;base64,${output.toString("base64")}`;
};

export class CompanySignatureController {
  constructor(private obaol = false) {}
  async get(req: Request, res: Response, next: NextFunction) { try { const company: any = await targetCompany(req, this.obaol); return res.json({ success: true, data: await publicSignature(company.documentSignature) }); } catch (e) { next(e); } }
  async save(req: Request, res: Response, next: NextFunction) { try {
    const company: any = await targetCompany(req, this.obaol);
    const signerName = String(req.body?.signerName || "").trim().slice(0, 150), signerDesignation = String(req.body?.signerDesignation || "").trim().slice(0, 150);
    if (!signerName) return res.status(400).json({ success: false, message: "Signer name is required." });
    const imageDataUrl = req.file ? await processSignatureImage(req.file) : await signatureDataUrl(company.documentSignature);
    if (!imageDataUrl) return res.status(400).json({ success: false, message: "Signature image is required." });
    const previousObjectKey = String(company.documentSignature?.objectKey || "");
    let storage = previousObjectKey ? { storageProvider: "s3", objectKey: previousObjectKey, checksum: company.documentSignature.checksum } : {};
    if (req.file) { const buffer = Buffer.from(imageDataUrl.split(",")[1], "base64"); const uploaded = await putObject({ domain: "signatures", body: buffer, originalName: "signature.png", mimeType: "image/png", metadata: { companyId: String(company._id) } }); storage = { storageProvider: "s3", objectKey: uploaded.objectKey, checksum: uploaded.checksum }; }
    company.documentSignature = { imageDataUrl: "", ...storage, originalFileName: req.file?.originalname || company.documentSignature?.originalFileName || "signature.png", signerName, signerDesignation, updatedAt: new Date(), updatedBy: req.user?.id || null };
    await company.save();
    if (req.file && previousObjectKey && previousObjectKey !== (storage as any).objectKey) await deleteObject(previousObjectKey).catch(() => undefined);
    return res.json({ success: true, data: await publicSignature(company.documentSignature), message: "Document signature saved." });
  } catch (e) { next(e); } }
  async remove(req: Request, res: Response, next: NextFunction) { try { const company: any = await targetCompany(req, this.obaol); const key = company.documentSignature?.objectKey; company.documentSignature = undefined; await company.save(); if (key) await deleteObject(key).catch(() => undefined); return res.json({ success: true, data: null }); } catch (e) { next(e); } }
}
