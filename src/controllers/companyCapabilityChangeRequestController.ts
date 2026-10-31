import { Request, Response } from "express";
import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyCapabilityChangeRequestModel, COMPANY_CAPABILITY_REQUEST_STATUSES } from "../database/models/companyCapabilityChangeRequest";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { CompanyInterestProfileModel } from "../database/models/companyInterestProfile";
import { AdminModel } from "../database/models/admin";
import { NotificationModel } from "../database/models/notification";
import { CANONICAL_COMPANY_FUNCTION_SLUGS } from "../utils/companyCapabilities";

const objectIds = (value: unknown) => Array.from(new Set((Array.isArray(value) ? value : []).map(String).filter(Boolean)));
const role = (req: Request) => String(req.user?.role || "").toLowerCase();
export const COMPANY_CAPABILITY_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type SubmissionEligibility = {
  canSubmit: boolean;
  reason: "PENDING_REVIEW" | "APPROVAL_COOLDOWN" | null;
  nextEligibleAt: string | null;
  pendingRequestId: string | null;
  stalePendingBefore: Date | null;
};

const submissionEligibility = async (companyId: string, now = new Date()): Promise<SubmissionEligibility> => {
  const pending = await CompanyCapabilityChangeRequestModel.findOne({ companyId, status: "PENDING_REVIEW", isDeleted: false })
    .select("_id createdAt")
    .sort({ createdAt: -1 })
    .lean();
  const latestDecision = await CompanyCapabilityChangeRequestModel.findOne({
    companyId,
    status: { $in: ["APPROVED", "REJECTED"] },
    isDeleted: false,
  })
    .select("status reviewedAt createdAt")
    .sort({ reviewedAt: -1, createdAt: -1 })
    .lean();
  const decisionAt = latestDecision
    ? new Date((latestDecision as any).reviewedAt || (latestDecision as any).createdAt)
    : null;
  const pendingAt = pending ? new Date((pending as any).createdAt) : null;

  if (pending && (!decisionAt || Number.isNaN(decisionAt.getTime()) || (pendingAt && pendingAt > decisionAt))) {
    return { canSubmit: false, reason: "PENDING_REVIEW", nextEligibleAt: null, pendingRequestId: String(pending._id), stalePendingBefore: null };
  }

  if (latestDecision?.status === "APPROVED") {
    const approvedAt = decisionAt as Date;
    const nextEligibleAt = new Date(approvedAt.getTime() + COMPANY_CAPABILITY_CHANGE_COOLDOWN_MS);
    if (!Number.isNaN(nextEligibleAt.getTime()) && now < nextEligibleAt) {
      return { canSubmit: false, reason: "APPROVAL_COOLDOWN", nextEligibleAt: nextEligibleAt.toISOString(), pendingRequestId: null, stalePendingBefore: pending ? decisionAt : null };
    }
  }

  return { canSubmit: true, reason: null, nextEligibleAt: null, pendingRequestId: null, stalePendingBefore: pending ? decisionAt : null };
};

const publicEligibility = ({ stalePendingBefore: _stalePendingBefore, ...eligibility }: SubmissionEligibility) => eligibility;

const validateSelection = (ids: string[], priorities: string[], label: string) => {
  if (ids.length < 1 || ids.length > 6 || ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw Object.assign(new Error(`Select between 1 and 6 valid ${label} categories.`), { status: 400 });
  }
  if (priorities.length > 3 || priorities.some((id) => !ids.includes(id))) {
    throw Object.assign(new Error(`${label} priorities must contain up to 3 selected categories.`), { status: 400 });
  }
};

export class CompanyCapabilityChangeRequestController {
  async create(req: Request, res: Response) {
    try {
      if (role(req) !== "associate") return res.status(403).json({ success: false, message: "Only associates can request company capability changes." });
      const requesterId = String(req.user?.id || "");
      const requester = await AssociateModel.findOne({ _id: requesterId, isDeleted: { $ne: true } }).select("associateCompany").lean();
      const companyId = String((requester as any)?.associateCompany || "");
      if (!companyId) return res.status(403).json({ success: false, message: "You must be linked to a company before submitting a request." });

      const providedIds = objectIds(req.body?.requestedProvidedFunctionIds);
      const soughtIds = objectIds(req.body?.requestedSoughtFunctionIds);
      const providedPriorities = objectIds(req.body?.requestedProvidedFunctionPriorities);
      const soughtPriorities = objectIds(req.body?.requestedSoughtFunctionPriorities);
      validateSelection(providedIds, providedPriorities, "provided");
      validateSelection(soughtIds, soughtPriorities, "sought");

      const allIds = Array.from(new Set([...providedIds, ...soughtIds]));
      const validCount = await CompanyFunctionModel.countDocuments({ _id: { $in: allIds }, isActive: true, slug: { $in: CANONICAL_COMPANY_FUNCTION_SLUGS } });
      if (validCount !== allIds.length) return res.status(400).json({ success: false, message: "One or more company categories are unavailable." });
      const eligibility = await submissionEligibility(companyId);
      if (!eligibility.canSubmit) {
        const message = eligibility.reason === "PENDING_REVIEW"
          ? "This company already has a capability change awaiting review."
          : `Company capabilities can be changed again after ${new Date(String(eligibility.nextEligibleAt)).toLocaleString()}.`;
        return res.status(409).json({ success: false, code: eligibility.reason, message, nextEligibleAt: eligibility.nextEligibleAt });
      }
      if (eligibility.stalePendingBefore) {
        await CompanyCapabilityChangeRequestModel.updateMany({
          companyId,
          status: "PENDING_REVIEW",
          isDeleted: false,
          createdAt: { $lte: eligibility.stalePendingBefore },
        }, { $set: {
          status: "REJECTED",
          reviewNotes: "Superseded by a newer completed capability decision.",
          reviewedAt: new Date(),
        } });
      }

      const created = await CompanyCapabilityChangeRequestModel.create({
        requesterAssociateId: requesterId,
        companyId,
        requestedProvidedFunctionIds: providedIds,
        requestedSoughtFunctionIds: soughtIds,
        requestedProvidedFunctionPriorities: providedPriorities,
        requestedSoughtFunctionPriorities: soughtPriorities,
        note: String(req.body?.note || "").trim(),
      });
      const admins = await AdminModel.find({ isActive: true, isDeleted: { $ne: true } }).select("_id").lean();
      if (admins.length) await NotificationModel.insertMany(admins.map((admin: any) => ({
        recipientUserId: admin._id, recipientRole: "Admin", type: "APPROVAL_REQUESTED",
        title: "Company capability approval requested", message: "A company submitted changes to its provided and sought capabilities.",
        entityType: "APPROVAL", entityId: created._id, route: "/dashboard/approvals?workflow=capabilities", priority: "high",
      })));
      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      const status = error?.code === 11000 ? 409 : Number(error?.status || 500);
      return res.status(status).json({
        success: false,
        ...(error?.code === 11000 ? { code: "PENDING_REVIEW" } : {}),
        message: error?.code === 11000 ? "This company already has a capability change awaiting review." : error?.message || "Failed to create capability request.",
      });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const currentRole = role(req);
      if (!["admin", "associate"].includes(currentRole)) return res.status(403).json({ success: false, message: "Access denied." });
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const query: any = { isDeleted: { $ne: true } };
      const status = String(req.query.status || "").toUpperCase();
      if (status && status !== "ALL") {
        if (!COMPANY_CAPABILITY_REQUEST_STATUSES.includes(status as any)) return res.status(400).json({ success: false, message: "Invalid status." });
        query.status = status;
      }
      if (currentRole === "associate") {
        const associate = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
        query.companyId = (associate as any)?.associateCompany || new mongoose.Types.ObjectId("000000000000000000000000");
      } else if (req.query.companyId && mongoose.Types.ObjectId.isValid(String(req.query.companyId))) {
        query.companyId = req.query.companyId;
      }
      const search = String(req.query.search || "").trim();
      if (search && currentRole === "admin") {
        const companyIds = await AssociateCompanyModel.find({ name: { $regex: search, $options: "i" }, isDeleted: { $ne: true } }).distinct("_id");
        query.companyId = { $in: companyIds };
      }
      const [total, rows] = await Promise.all([
        CompanyCapabilityChangeRequestModel.countDocuments(query),
        CompanyCapabilityChangeRequestModel.find(query)
          .populate("companyId", "name email")
          .populate("requesterAssociateId", "name email")
          .populate("reviewedBy", "name email")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);
      const eligibility = currentRole === "associate"
        ? await submissionEligibility(String(query.companyId))
        : null;
      return res.json({ success: true, data: rows, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1, eligibility: eligibility ? publicEligibility(eligibility) : null } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to load capability requests." });
    }
  }

  async review(req: Request, res: Response) {
    const session = await mongoose.startSession();
    try {
      if (role(req) !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });
      const id = String(req.params.id || "");
      const action = String(req.body?.action || "").toUpperCase();
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid request id." });
      if (!["APPROVE", "REJECT"].includes(action)) return res.status(400).json({ success: false, message: "Action must be APPROVE or REJECT." });
      let reviewed: any;
      await session.withTransaction(async () => {
        const request = await CompanyCapabilityChangeRequestModel.findOne({ _id: id, status: "PENDING_REVIEW", isDeleted: false }).session(session).lean();
        if (!request) throw Object.assign(new Error("Pending capability request not found."), { status: 404 });
        if (action === "APPROVE") {
          const ids = Array.from(new Set([...(request as any).requestedProvidedFunctionIds, ...(request as any).requestedSoughtFunctionIds].map(String)));
          const functions = await CompanyFunctionModel.find({ _id: { $in: ids }, isActive: true, slug: { $in: CANONICAL_COMPANY_FUNCTION_SLUGS } }).select("_id slug").session(session).lean();
          if (functions.length !== ids.length) throw Object.assign(new Error("One or more requested categories are no longer available."), { status: 400 });
          const slugById = new Map(functions.map((item: any) => [String(item._id), String(item.slug)]));
          await AssociateCompanyModel.updateOne({ _id: request.companyId, isDeleted: { $ne: true } }, { $set: {
            providedCapabilities: (request as any).requestedProvidedFunctionIds.map((value: any) => slugById.get(String(value))),
            soughtCapabilities: (request as any).requestedSoughtFunctionIds.map((value: any) => slugById.get(String(value))),
            providedCapabilityPriorities: (request as any).requestedProvidedFunctionPriorities,
            soughtCapabilityPriorities: (request as any).requestedSoughtFunctionPriorities,
          } }, { session });
          await CompanyInterestProfileModel.deleteOne({ associateCompanyId: request.companyId }).session(session);
        }
        const reviewedAt = new Date();
        reviewed = await CompanyCapabilityChangeRequestModel.findByIdAndUpdate(id, { $set: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
          reviewNotes: String(req.body?.notes || "").trim(),
          reviewedBy: req.user?.id,
          reviewedAt,
        } }, { new: true, session }).lean();
        if (action === "APPROVE") {
          await CompanyCapabilityChangeRequestModel.updateMany({
            _id: { $ne: request._id },
            companyId: request.companyId,
            status: "PENDING_REVIEW",
            isDeleted: false,
            createdAt: { $lte: reviewedAt },
          }, { $set: {
            status: "REJECTED",
            reviewNotes: "Superseded by an approved capability request.",
            reviewedBy: req.user?.id,
            reviewedAt,
          } }, { session });
        }
      });
      if (reviewed?.requesterAssociateId) await NotificationModel.create({
        recipientUserId: reviewed.requesterAssociateId, recipientRole: "Associate",
        type: action === "APPROVE" ? "APPROVAL_APPROVED" : "GENERAL_MESSAGE",
        title: `Company capability request ${action === "APPROVE" ? "approved" : "rejected"}`,
        message: action === "APPROVE" ? "Your company's capability changes are now active." : "Your company's capability changes were not approved.",
        entityType: "APPROVAL", entityId: reviewed._id, route: "/dashboard/company", priority: action === "APPROVE" ? "medium" : "high",
      });
      return res.json({ success: true, data: reviewed });
    } catch (error: any) {
      return res.status(Number(error?.status || 500)).json({ success: false, message: error?.message || "Failed to review capability request." });
    } finally {
      await session.endSession();
    }
  }
}

export const companyCapabilityChangeRequestController = new CompanyCapabilityChangeRequestController();
