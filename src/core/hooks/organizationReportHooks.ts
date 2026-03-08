import mongoose from "mongoose";
import { AssociateModel } from "../../database/models/associate";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { ORGANIZATION_REPORT_REASONS } from "../../database/models/organizationReport";
import { ExecutionMode, HookFunction } from "../types";

const EMPTY_QUERY = { _id: "000000000000000000000000" };

const buildError = (message: string, status = 400) => {
  const err: any = new Error(message);
  err.status = status;
  err.statusCode = status;
  return err;
};

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();

const mergeWithScope = (baseQuery: any, scopeQuery: any) => {
  const base = { ...(baseQuery || {}) };
  if (!Object.keys(base).length) return scopeQuery;
  return { $and: [base, scopeQuery] };
};

const loadAssociateContext = async (associateId: string) => {
  return AssociateModel.findById(associateId)
    .select("_id associateCompany isDeleted")
    .lean();
};

export const organizationReportPreReadHook: HookFunction = async (query, _mode, _id, req) => {
  const roleLower = normalizeRole(req?.user?.role);
  const actorId = String(req?.user?.id || "").trim();

  if (!actorId) {
    throw buildError("Authentication required.", 401);
  }

  const notDeletedScope = { isDeleted: { $ne: true } };
  if (roleLower === "admin") {
    return mergeWithScope(query, notDeletedScope);
  }

  if (roleLower !== "associate") {
    throw buildError("Access denied for organization reports.", 403);
  }

  const reporter = await loadAssociateContext(actorId);
  const reporterCompanyId = String((reporter as any)?.associateCompany || "");
  if (!reporterCompanyId) {
    return mergeWithScope(query, { ...notDeletedScope, ...EMPTY_QUERY });
  }

  const company = await AssociateCompanyModel.findById(reporterCompanyId)
    .select("_id supervisor")
    .lean();
  const isSupervisor = String((company as any)?.supervisor || "") === actorId;

  const scopeQuery = isSupervisor
    ? { ...notDeletedScope, reporterCompanyId }
    : { ...notDeletedScope, reporterAssociateId: actorId };

  return mergeWithScope(query, scopeQuery);
};

export const organizationReportPreWriteHook: HookFunction = async (payload, mode, _id, req) => {
  const roleLower = normalizeRole(req?.user?.role);
  const actorId = String(req?.user?.id || "").trim();

  if (!actorId) {
    throw buildError("Authentication required.", 401);
  }

  if (roleLower === "admin") {
    return payload;
  }

  if (roleLower !== "associate") {
    throw buildError("Access denied for organization reports.", 403);
  }

  if (mode === ExecutionMode.UPDATE || mode === ExecutionMode.DELETE) {
    throw buildError("Associates cannot update or delete organization reports.", 403);
  }

  if (mode !== ExecutionMode.CREATE) {
    return payload;
  }

  const reporter = await loadAssociateContext(actorId);
  const reporterCompanyId = String((reporter as any)?.associateCompany || "");
  if (!reporterCompanyId) {
    throw buildError("You must be linked to a company before submitting a report.", 403);
  }

  const nextPayload: any = { ...(payload || {}) };
  const targetAssociateId = String(nextPayload.targetAssociateId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(targetAssociateId)) {
    throw buildError("targetAssociateId must be a valid associate id.");
  }
  if (targetAssociateId === actorId) {
    throw buildError("You cannot report yourself.");
  }

  const targetAssociate = await AssociateModel.findOne({
    _id: targetAssociateId,
    isDeleted: { $ne: true },
  })
    .select("_id associateCompany")
    .lean();
  if (!targetAssociate) {
    throw buildError("Target associate not found.");
  }

  const targetCompanyId = String((targetAssociate as any)?.associateCompany || "");
  if (!targetCompanyId || targetCompanyId !== reporterCompanyId) {
    throw buildError("You can report only members of your own company.", 403);
  }

  const reasonCode = String(nextPayload.reasonCode || "").trim().toUpperCase();
  if (!ORGANIZATION_REPORT_REASONS.includes(reasonCode as any)) {
    throw buildError("Invalid reasonCode for organization report.");
  }

  const description = String(nextPayload.description || "").trim();
  if (!description) {
    throw buildError("description is required.");
  }

  nextPayload.reasonCode = reasonCode;
  nextPayload.description = description;
  nextPayload.reporterAssociateId = actorId;
  nextPayload.reporterCompanyId = reporterCompanyId;
  nextPayload.targetAssociateId = targetAssociateId;
  nextPayload.targetCompanyId = targetCompanyId;
  nextPayload.status = "PENDING_REVIEW";
  nextPayload.actionType = "NONE";
  nextPayload.adminNotes = "";
  nextPayload.reviewedBy = null;
  nextPayload.reviewedAt = null;
  nextPayload.isDeleted = false;

  return nextPayload;
};
