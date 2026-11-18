import { Request } from "express";
import { SignatureModel } from "../database/models/signature";
import { AssociateModel } from "../database/models/associate";

export const actorCompanyId = async (req: Request) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "associate" || !req.user?.id) return null;
  const actor: any = await AssociateModel.findById(req.user.id).select("associateCompany").lean();
  return actor?.associateCompany || null;
};

export const activeSignatureAvailability = async (input: { userId?: any; companyId?: any; requireCompany?: boolean }) => {
  const clauses: any[] = [];
  if (!input.requireCompany && input.userId) clauses.push({ ownerType: "USER", ownerUserId: input.userId });
  if (input.companyId) clauses.push({ ownerType: "COMPANY", companyId: input.companyId });
  if (!clauses.length) return { available: false, signature: null };
  const signature: any = await SignatureModel.findOne({ status: "ACTIVE", $or: clauses }).sort({ ownerType: 1, version: -1 }).select("_id ownerType ownerUserId companyId version checksum signerName").lean();
  return { available: Boolean(signature), signature };
};

export const workflowSignatureAvailability = async (req: Request) => {
  const role = String(req.user?.role || "").toLowerCase();
  const companyId = await actorCompanyId(req);
  const explicitCompanyId = req.body?.companyId || req.body?.associateCompanyId || req.body?.ownerCompanyId || null;
  const privileged = ["admin", "operator", "team"].includes(role);
  const subjectCompanyId = privileged ? explicitCompanyId : companyId;
  return {
    ...(await activeSignatureAvailability({ userId: req.user?.id, companyId: subjectCompanyId, requireCompany: privileged && Boolean(subjectCompanyId) })),
    companyId: subjectCompanyId || null,
  };
};
