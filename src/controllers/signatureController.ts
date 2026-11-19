import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import sharp from "sharp";
import { SignatureModel } from "../database/models/signature";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { deleteObject, getObjectBuffer, putObject, storageConfiguration, verifyObjectRoundTrip } from "../services/objectStorageService";
import { consumeAuthorizationIntent } from "../services/authorizationIntentService";
import { resolveObaolCompany } from "../utils/obaolCompanyConfig";

const companyFor = async (req: Request) => {
  const associate: any = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
  if (!associate?.associateCompany) return null;
  return AssociateCompanyModel.findOne({ _id: associate.associateCompany, registrationStatus: "APPROVED", isDeleted: { $ne: true } }).select("_id name").lean();
};
const isObaolScope = (req: Request) => String(req.query?.scope || req.body?.scope || "").trim().toLowerCase() === "obaol";
const obaolCompanyForAdmin = async (req: Request) => {
  if (String(req.user?.role || "").toLowerCase() !== "admin") {
    throw Object.assign(new Error("Admin access is required for the OBAOL company signature."), { statusCode: 403 });
  }
  const resolved = await resolveObaolCompany();
  if (resolved.status !== "CONFIGURED" || !resolved.companyId) {
    throw Object.assign(new Error("Configure a valid OBAOL company before managing its signature."), { statusCode: 409, code: "OBAOL_COMPANY_REQUIRED" });
  }
  const company: any = await AssociateCompanyModel.findOne({ _id: resolved.companyId, isDeleted: { $ne: true } }).select("_id name").lean();
  if (!company) throw Object.assign(new Error("The configured OBAOL company was not found."), { statusCode: 404 });
  return company;
};
const scopedCompanyFor = async (req: Request) => isObaolScope(req) ? obaolCompanyForAdmin(req) : companyFor(req);
const scopeFor = async (req: Request, ownerType: string) => {
  if (isObaolScope(req) && ownerType !== "COMPANY") {
    throw Object.assign(new Error("The OBAOL configuration accepts company signatures only."), { statusCode: 400 });
  }
  if (ownerType === "USER") return { ownerType: "USER", ownerUserId: new mongoose.Types.ObjectId(req.user!.id), companyId: null };
  const company: any = await scopedCompanyFor(req);
  if (!company) throw Object.assign(new Error("An approved company account is required."), { statusCode: 403 });
  return { ownerType: "COMPANY", ownerUserId: null, companyId: company._id };
};
const expose = (row: any) => ({ id: row._id, ownerType: row.ownerType, companyId: row.companyId || null, signerName: row.signerName, signerDesignation: row.signerDesignation, status: row.status, version: row.version, checksum: row.checksum, registeredAt: row.registeredAt, verifiedAt: row.verifiedAt, updatedAt: row.updatedAt, previewUrl: `/v1/web/signatures/${row._id}/preview` });

export const normalizeSignaturePng = async (file: Express.Multer.File) => {
  try {
    if (!file || file.mimetype !== "image/png" || file.buffer.length < 8 || !file.buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Object.assign(new Error("Upload a valid transparent PNG signature."), { statusCode: 400, code: "SIGNATURE_IMAGE_INVALID" });
    const image = sharp(file.buffer, { failOn: "error", limitInputPixels: 12_000_000, animated: false });
    const meta = await image.metadata();
    if (meta.format !== "png" || !meta.hasAlpha || !meta.width || !meta.height || meta.width < 20 || meta.height < 10) throw Object.assign(new Error("The signature must be a transparent PNG of a usable size."), { statusCode: 400, code: "SIGNATURE_IMAGE_INVALID" });
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let visible = 0;
    for (let i = 3; i < data.length; i += info.channels) if (data[i] > 20) visible += 1;
    if (visible < Math.max(30, Math.floor(meta.width * meta.height * 0.001))) throw Object.assign(new Error("The PNG does not contain a visible signature."), { statusCode: 400, code: "SIGNATURE_IMAGE_INVALID" });
    const output = await sharp(data, { raw: info }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize({ width: 1200, height: 400, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9, palette: false }).toBuffer();
    if (output.length > 1_500_000) throw Object.assign(new Error("Processed signature is too large."), { statusCode: 400, code: "SIGNATURE_IMAGE_INVALID" });
    return output;
  } catch (error: any) {
    if (error?.code === "SIGNATURE_IMAGE_INVALID") throw error;
    throw Object.assign(new Error("The PNG could not be processed. Export it again as a non-animated transparent PNG."), { statusCode: 400, code: "SIGNATURE_NORMALIZATION_FAILED", cause: error });
  }
};

export class SignatureController {
  async list(req: Request, res: Response, next: NextFunction) { try {
    const obaolScope = isObaolScope(req);
    const company: any = await scopedCompanyFor(req);
    const clauses: any[] = obaolScope ? [] : [{ ownerType: "USER", ownerUserId: req.user?.id }];
    if (company) clauses.push({ ownerType: "COMPANY", companyId: company._id });
    const rows = await SignatureModel.find({ $or: clauses, status: { $ne: "REVOKED" } }).sort({ ownerType: 1, version: -1 }).lean();
    return res.json({ success: true, data: rows.map(expose), company: company ? { id: company._id, name: company.name } : null, scope: obaolScope ? "OBAOL" : "OWN", storage: { configured: storageConfiguration().configured } });
  } catch (e) { next(e); } }
  async upload(req: Request, res: Response, next: NextFunction) { try {
    const ownerType = String(req.body?.ownerType || "USER").toUpperCase(); if (!["USER", "COMPANY"].includes(ownerType)) return res.status(400).json({ success: false, message: "Choose a personal or company signature." });
    const scope: any = await scopeFor(req, ownerType), signerName = String(req.body?.signerName || "").trim().slice(0, 150), signerDesignation = String(req.body?.signerDesignation || "").trim().slice(0, 150);
    if (!signerName) return res.status(400).json({ success: false, message: "Signature owner name is required." });
    const buffer = await normalizeSignaturePng(req.file as any);
    const latest: any = await SignatureModel.findOne(scope).sort({ version: -1 }).lean();
    const stored = await putObject({ domain: `signatures/${ownerType.toLowerCase()}`, body: buffer, originalName: "signature.png", mimeType: "image/png", metadata: { ownerType, actorId: String(req.user?.id), ...(scope.companyId ? { companyId: String(scope.companyId) } : {}) } });
    try {
      await verifyObjectRoundTrip(stored.objectKey, buffer, stored.checksum);
      const row: any = await SignatureModel.create({ ...scope, ownerRole: req.user?.role || "", signerName, signerDesignation, version: Number(latest?.version || 0) + 1, objectKey: stored.objectKey, checksum: stored.checksum, size: stored.size, originalFileName: String(req.file?.originalname || "signature.png").slice(0, 200) });
      return res.status(201).json({ success: true, data: expose(row), requestId: req.requestId });
    } catch (error: any) {
      await deleteObject(stored.objectKey).catch(() => undefined);
      if (String(error?.code || "").startsWith("S3_")) throw error;
      throw Object.assign(new Error("The signature was stored but its database record could not be created."), { statusCode: 500, code: "SIGNATURE_RECORD_FAILED", cause: error });
    }
  } catch (e) { next(e); } }
  async preview(req: Request, res: Response, next: NextFunction) { try {
    const row: any = await SignatureModel.findById(req.params.id).select("+objectKey"); if (!row || row.status === "REVOKED") return res.status(404).end();
    const scope: any = await scopeFor(req, row.ownerType); if (String(row.ownerUserId || "") !== String(scope.ownerUserId || "") || String(row.companyId || "") !== String(scope.companyId || "")) return res.status(403).end();
    const buffer = await getObjectBuffer(row.objectKey); res.set({ "Content-Type": "image/png", "Cache-Control": "private, no-store", "Content-Disposition": "inline; filename=signature.png", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" }); return res.send(buffer);
  } catch (e) { next(e); } }
  async activate(req: Request, res: Response, next: NextFunction) { try {
    const row: any = await SignatureModel.findById(req.params.id); if (!row || row.status !== "PENDING_VERIFICATION") return res.status(409).json({ success: false, message: "Pending signature not found." });
    const scope: any = await scopeFor(req, row.ownerType); if (String(row.ownerUserId || "") !== String(scope.ownerUserId || "") || String(row.companyId || "") !== String(scope.companyId || "")) return res.status(403).json({ success: false, message: "Signature access denied." });
    const payload = { signatureId: String(row._id), signatureVersion: row.version, checksum: row.checksum, ownerType: row.ownerType };
    const auth: any = await consumeAuthorizationIntent(req, String(req.body?.authorizationIntentId || ""), "SIGNATURE_ACTIVATE", payload);
    await SignatureModel.updateMany({ ...scope, _id: { $ne: row._id }, status: "ACTIVE" }, { $set: { status: "REVOKED", revokedAt: new Date(), revokedBy: req.user?.id } });
    row.status = "ACTIVE"; row.verifiedAt = new Date(); row.verifiedBy = req.user?.id; row.verificationMethod = auth.authenticationMethod; await row.save(); return res.json({ success: true, data: expose(row) });
  } catch (e) { next(e); } }
  async remove(req: Request, res: Response, next: NextFunction) { try {
    const row: any = await SignatureModel.findById(req.params.id).select("+objectKey"); if (!row || row.status === "REVOKED") return res.status(404).json({ success: false, message: "Signature not found." });
    const scope: any = await scopeFor(req, row.ownerType); if (String(row.ownerUserId || "") !== String(scope.ownerUserId || "") || String(row.companyId || "") !== String(scope.companyId || "")) return res.status(403).json({ success: false, message: "Signature access denied." });
    const payload = { signatureId: String(row._id), signatureVersion: row.version, checksum: row.checksum, ownerType: row.ownerType };
    await consumeAuthorizationIntent(req, String(req.body?.authorizationIntentId || ""), "SIGNATURE_REVOKE", payload);
    row.status = "REVOKED"; row.revokedAt = new Date(); row.revokedBy = req.user?.id; await row.save(); await deleteObject(row.objectKey).catch(() => undefined); return res.json({ success: true, data: null });
  } catch (e) { next(e); } }
}
