import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AdminModel } from "../database/models/admin";
import { CatalogRevisionModel } from "../database/models/catalogRevision";
import { NotificationModel } from "../database/models/notification";
import {
  MODERATED_ENTITY_MODELS, ModeratedEntityType, assertAccessibleParent, assertNoDuplicate,
  catalogModerationSummary, getApprovedAssociateContext, pickEntityFields,
} from "../services/catalogModeration.service";

const ENTITY_TYPES = ["category", "subCategory", "product", "productVariant"] as const;
const parseEntityType = (value: unknown): ModeratedEntityType => {
  const type = String(value || "") as ModeratedEntityType;
  if (!(ENTITY_TYPES as readonly string[]).includes(type)) throw Object.assign(new Error("Unsupported catalog entity type."), { status: 400 });
  return type;
};
const positiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), max) : fallback;
};
const ownerQuery = (associateId: string) => ({ createdByAssociate: new mongoose.Types.ObjectId(associateId) });

const notifyAdmins = async (entityType: string, entityId: any, label: string) => {
  const admins = await AdminModel.find({ isActive: true, isDeleted: { $ne: true } }).select("_id").lean();
  if (!admins.length) return;
  await NotificationModel.insertMany(admins.map((admin: any) => ({
    recipientUserId: admin._id, recipientRole: "Admin", type: "APPROVAL_REQUESTED",
    title: "Catalog approval requested", message: `${label} was submitted for catalog approval.`,
    entityType: "APPROVAL", entityId, route: "/dashboard/approvals", priority: "high",
    payload: { catalogEntityType: entityType },
  })));
};
const notifyAssociate = async (row: any, entityType: string, action: string) => {
  if (!row?.createdByAssociate) return;
  await NotificationModel.create({
    recipientUserId: row.createdByAssociate, recipientRole: "Associate",
    type: action === "APPROVE" ? "APPROVAL_APPROVED" : "GENERAL_MESSAGE",
    title: `Catalog ${action === "APPROVE" ? "approved" : "needs correction"}`,
    message: `${row.name || "Your listing"} was ${action === "APPROVE" ? "approved" : "returned for correction"}.`,
    entityType: "APPROVAL", entityId: row._id, route: "/dashboard/catalog", priority: action === "APPROVE" ? "medium" : "high",
    payload: { catalogEntityType: entityType, approvalStatus: action === "APPROVE" ? "APPROVED" : "REJECTED" },
  });
};

export class CatalogModerationController {
  async createDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const context = await getApprovedAssociateContext(String(req.user?.id || ""));
      const payload: any = pickEntityFields(entityType, req.body);
      if ((entityType === "product" || entityType === "productVariant") && !String(payload.description || "").trim()) {
        payload.description = String(payload.name || "").trim();
      }
      await assertAccessibleParent(entityType, payload, String(context.associateId));
      await assertNoDuplicate(entityType, payload);
      Object.assign(payload, {
        approvalStatus: "DRAFT", createdByAssociate: context.associateId, createdByCompany: context.companyId,
        approvalRequestedAt: null, approvedAt: null, approvedBy: null, reviewNotes: "",
      });
      if (entityType === "variantRate") {
        payload.associate = context.associateId; payload.associateCompany = context.companyId;
        payload.isLive = Boolean(req.body?.isLive);
      }
      const row = await MODERATED_ENTITY_MODELS[entityType].create(payload);
      return res.status(201).json({ success: true, data: { ...row.toObject(), moderation: await catalogModerationSummary(entityType, row.toObject()) } });
    } catch (error) { next(error); }
  }

  async updateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const context = await getApprovedAssociateContext(String(req.user?.id || ""));
      const model = MODERATED_ENTITY_MODELS[entityType];
      const row: any = await model.findOne({ _id: req.params.id, ...ownerQuery(String(context.associateId)), isDeleted: { $ne: true } });
      if (!row) return res.status(404).json({ success: false, message: "Catalog proposal was not found." });
      const changes = pickEntityFields(entityType, req.body);
      const merged = { ...row.toObject(), ...changes };
      await assertAccessibleParent(entityType, merged, String(context.associateId));
      await assertNoDuplicate(entityType, merged, String(row._id));
      if (String(row.approvalStatus || "APPROVED") === "APPROVED") {
        const revision = await CatalogRevisionModel.findOneAndUpdate(
          { entityType, entityId: row._id, status: { $in: ["DRAFT", "PENDING_REVIEW"] } },
          { $set: { proposedChanges: changes, status: "DRAFT", reviewNotes: "", approvalRequestedAt: null, baseUpdatedAt: row.updatedAt || row.createdAt, createdByAssociate: context.associateId, createdByCompany: context.companyId } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        return res.json({ success: true, data: revision, message: "Revision saved without changing the approved version." });
      }
      Object.assign(row, changes, { approvalStatus: "DRAFT", reviewNotes: "", approvalRequestedAt: null });
      await row.save();
      return res.json({ success: true, data: { ...row.toObject(), moderation: await catalogModerationSummary(entityType, row.toObject()) } });
    } catch (error) { next(error); }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const context = await getApprovedAssociateContext(String(req.user?.id || ""));
      const row: any = await MODERATED_ENTITY_MODELS[entityType].findOne({ _id: req.params.id, ...ownerQuery(String(context.associateId)), isDeleted: { $ne: true } });
      if (!row) return res.status(404).json({ success: false, message: "Catalog proposal was not found." });
      if (String(row.approvalStatus || "APPROVED") === "APPROVED") {
        const revision: any = await CatalogRevisionModel.findOne({ entityType, entityId: row._id, status: "DRAFT" });
        if (!revision) return res.status(409).json({ success: false, message: "No draft revision is available to submit." });
        const submittedRevision = await CatalogRevisionModel.findOneAndUpdate(
          { _id: revision._id, status: "DRAFT" },
          { $set: { status: "PENDING_REVIEW", approvalRequestedAt: new Date(), reviewNotes: "" } },
          { new: true },
        );
        await notifyAdmins(entityType, revision._id, row.name || "Listing revision");
        return res.json({ success: true, data: submittedRevision, message: "Revision submitted for admin review." });
      }
      if (!['DRAFT', 'REJECTED'].includes(String(row.approvalStatus))) {
        return res.status(409).json({ success: false, message: "This proposal is already awaiting review." });
      }
      await assertAccessibleParent(entityType, row.toObject(), String(context.associateId));
      row.approvalStatus = "PENDING_REVIEW"; row.approvalRequestedAt = new Date(); row.reviewNotes = ""; await row.save();
      await notifyAdmins(entityType, row._id, row.name || "Commodity listing");
      return res.json({ success: true, data: row, message: "Submitted for admin review." });
    } catch (error) { next(error); }
  }

  async mine(req: Request, res: Response, next: NextFunction) {
    try {
      const context = await getApprovedAssociateContext(String(req.user?.id || ""));
      const requested = req.query.entityType ? [parseEntityType(req.query.entityType)] : [...ENTITY_TYPES];
      const groups = await Promise.all(requested.map(async (entityType) => {
        const rows: any[] = await MODERATED_ENTITY_MODELS[entityType].find({ ...ownerQuery(String(context.associateId)), isDeleted: { $ne: true } }).sort({ updatedAt: -1, createdAt: -1 }).lean();
        return [entityType, await Promise.all(rows.map(async row => ({ ...row, moderation: await catalogModerationSummary(entityType, row) })))] as const;
      }));
      return res.json({ success: true, data: Object.fromEntries(groups) });
    } catch (error) { next(error); }
  }

  async listApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const page = positiveInt(req.query.page, 1, 100000); const limit = positiveInt(req.query.limit, 20, 100);
      const status = String(req.query.status || "PENDING_REVIEW").toUpperCase();
      const model = MODERATED_ENTITY_MODELS[entityType];
      const [entities, revisions] = await Promise.all([
        model.find({ approvalStatus: status }).populate("createdByAssociate", "name email").populate("createdByCompany", "name").lean(),
        CatalogRevisionModel.find({ entityType, status }).populate("createdByAssociate", "name email").populate("createdByCompany", "name").lean(),
      ]);
      const combined = [
        ...entities.map((row: any) => ({ ...row, sourceKind: "ENTITY" })),
        ...revisions.map((row: any) => ({ ...row, sourceKind: "REVISION" })),
      ].sort((a: any, b: any) => new Date(b.approvalRequestedAt || b.createdAt).getTime() - new Date(a.approvalRequestedAt || a.createdAt).getTime());
      const start = (page - 1) * limit;
      return res.json({ success: true, data: combined.slice(start, start + limit), meta: { page, limit, total: combined.length, pages: Math.max(1, Math.ceil(combined.length / limit)) } });
    } catch (error) { next(error); }
  }

  async review(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const action = String(req.body?.action || "").toUpperCase(); const notes = String(req.body?.notes || "").trim();
      if (!['APPROVE', 'REJECT'].includes(action)) return res.status(400).json({ success: false, message: "Action must be APPROVE or REJECT." });
      if (action === "REJECT" && !notes) return res.status(400).json({ success: false, message: "Review notes are required when returning a proposal." });
      const revision: any = await CatalogRevisionModel.findOne({ _id: req.params.id, entityType, status: "PENDING_REVIEW" });
      if (revision) {
        const target: any = await MODERATED_ENTITY_MODELS[entityType].findById(revision.entityId);
        if (!target) return res.status(404).json({ success: false, message: "Revision target was not found." });
        if (action === "APPROVE") {
          const targetVersion = new Date(target.updatedAt || target.createdAt).getTime();
          const revisionVersion = new Date(revision.baseUpdatedAt).getTime();
          if (!Number.isFinite(targetVersion) || !Number.isFinite(revisionVersion) || targetVersion !== revisionVersion) return res.status(409).json({ success: false, message: "The published record changed after this revision was created. Ask the Associate to resubmit." });
          await assertNoDuplicate(entityType, { ...target.toObject(), ...revision.proposedChanges }, String(target._id));
          Object.assign(target, revision.proposedChanges, { approvedAt: new Date(), approvedBy: req.user?.id, reviewNotes: "" }); await target.save();
          revision.status = "APPROVED"; revision.approvedAt = new Date(); revision.approvedBy = req.user?.id;
        } else revision.status = "REJECTED";
        revision.reviewNotes = notes; await revision.save(); await notifyAssociate(target, entityType, action);
        return res.json({ success: true, data: revision });
      }
      const row: any = await MODERATED_ENTITY_MODELS[entityType].findOne({ _id: req.params.id, approvalStatus: "PENDING_REVIEW" });
      if (!row) return res.status(404).json({ success: false, message: "Pending proposal was not found." });
      row.approvalStatus = action === "APPROVE" ? "APPROVED" : "REJECTED"; row.reviewNotes = notes;
      if (action === "APPROVE") { row.approvedAt = new Date(); row.approvedBy = req.user?.id; }
      await row.save(); await notifyAssociate(row, entityType, action);
      return res.json({ success: true, data: row });
    } catch (error) { next(error); }
  }
}

export const catalogModerationController = new CatalogModerationController();
