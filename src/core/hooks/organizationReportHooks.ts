import mongoose from "mongoose";
import { AssociateModel } from "../../database/models/associate";
import { InquiryModel } from "../../database/models/enquiry";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import {
  ORGANIZATION_REPORT_REASONS,
  OrganizationReportModel,
} from "../../database/models/organizationReport";
import { normalizeCompanyInterests } from "../../constants/companyInterests";
import { ExecutionMode, HookFunction } from "../types";

const EMPTY_QUERY = { _id: "000000000000000000000000" };

const buildError = (message: string, status = 400) => {
  const err: any = new Error(message);
  err.status = status;
  err.statusCode = status;
  return err;
};

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();

const stripControlQueryKeys = (query: any) => {
  const base = { ...(query || {}) };
  delete base.page;
  delete base.limit;
  delete base.sort;
  delete base.search;
  return base;
};

const mergeWithScope = (baseQuery: any, scopeQuery: any) => {
  const base = stripControlQueryKeys(baseQuery);
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
  if (process.env.NODE_ENV !== "production") {
    console.debug("[organization-reports] preRead incoming", {
      role: roleLower,
      queryKeys: Object.keys(query || {}),
    });
  }
  if (roleLower === "admin") {
    const merged = mergeWithScope(query, notDeletedScope);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[organization-reports] preRead merged-admin", merged);
    }
    return merged;
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

  const merged = mergeWithScope(query, scopeQuery);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[organization-reports] preRead merged-associate", {
      isSupervisor,
      merged,
    });
  }
  return merged;
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
  const reasonCode = String(nextPayload.reasonCode || "").trim().toUpperCase();
  if (!ORGANIZATION_REPORT_REASONS.includes(reasonCode as any)) {
    throw buildError("Invalid reasonCode for organization report.");
  }

  let description = String(nextPayload.description || "").trim();
  if (!description && reasonCode !== "REOPEN_INQUIRY_REQUEST") {
    throw buildError("description is required.");
  }

  if (reasonCode === "COMPANY_INTEREST_UPDATE") {
    const requestedInterests = normalizeCompanyInterests(nextPayload?.payload?.requestedInterests);
    if (!requestedInterests.length) {
      throw buildError("At least one valid requested interest is required for company interest update.");
    }

    // Keep only one active company-interest request per company.
    const supersedeResult = await OrganizationReportModel.updateMany(
      {
        reasonCode: "COMPANY_INTEREST_UPDATE",
        reporterCompanyId,
        isDeleted: { $ne: true },
        status: { $in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
      },
      {
        $set: {
          status: "REJECTED",
          adminNotes: "Auto-cancelled: superseded by newer company interest request.",
          actionType: "NONE",
          reviewedAt: new Date(),
          reviewedBy: null,
        },
      }
    );
    if (process.env.NODE_ENV !== "production") {
      console.debug("[organization-reports] superseded prior company-interest requests", {
        reporterCompanyId,
        modifiedCount: supersedeResult.modifiedCount,
      });
    }

    nextPayload.reasonCode = reasonCode;
    nextPayload.description = description;
    nextPayload.reporterAssociateId = actorId;
    nextPayload.reporterCompanyId = reporterCompanyId;
    nextPayload.targetAssociateId = actorId;
    nextPayload.targetCompanyId = reporterCompanyId;
    nextPayload.payload = { requestedInterests };
    nextPayload.status = "PENDING_REVIEW";
    nextPayload.actionType = "NONE";
    nextPayload.adminNotes = "";
    nextPayload.reviewedBy = null;
    nextPayload.reviewedAt = null;
    nextPayload.isDeleted = false;
    return nextPayload;
  }

  if (reasonCode === "REOPEN_INQUIRY_REQUEST") {
    const inquiryId = String(nextPayload?.payload?.inquiryId || nextPayload?.inquiryId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw buildError("Valid inquiryId is required for reopen request.");
    }

    const inquiry = await InquiryModel.findById(inquiryId).select("_id status").lean();
    if (!inquiry) {
      throw buildError("Inquiry not found.");
    }
    if (String((inquiry as any)?.status || "").toUpperCase() !== "CANCELLED") {
      throw buildError("Only cancelled enquiries can be reopened.");
    }

    if (!description) {
      description = "Reopen enquiry request";
    }

    nextPayload.reasonCode = reasonCode;
    nextPayload.description = description;
    nextPayload.reporterAssociateId = actorId;
    nextPayload.reporterCompanyId = reporterCompanyId;
    nextPayload.targetAssociateId = actorId;
    nextPayload.targetCompanyId = reporterCompanyId;
    nextPayload.payload = {
      inquiryId,
      requestedBy: actorId,
      note: description,
    };
    nextPayload.status = "PENDING_REVIEW";
    nextPayload.actionType = "NONE";
    nextPayload.adminNotes = "";
    nextPayload.reviewedBy = null;
    nextPayload.reviewedAt = null;
    nextPayload.isDeleted = false;
    return nextPayload;
  }

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
