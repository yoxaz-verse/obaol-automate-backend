import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AdminModel } from "../database/models/admin";
import { CatalogRevisionModel } from "../database/models/catalogRevision";
import { CatalogModerationAuditModel } from "../database/models/catalogModerationAudit";
import { NotificationModel } from "../database/models/notification";
import { CategoryModel } from "../database/models/category";
import { SubCategoryModel } from "../database/models/subCategory";
import { ProductModel } from "../database/models/product";
import { ProductVariantModel } from "../database/models/productVariant";
import { VariantRateModel } from "../database/models/variantRate";
import {
  MODERATED_ENTITY_MODELS, ModeratedEntityType, assertAccessibleParent, assertNoDuplicate,
  CATALOG_ITEM_LOCKED, catalogModerationSummary, getApprovedAssociateContext, getCatalogChain, getParent, pickEntityFields,
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
const lockedError = () => Object.assign(new Error("Approved catalog items are locked. Add a child item or contact an admin."), {
  status: 409, statusCode: 409, code: CATALOG_ITEM_LOCKED,
});

const dependencyIds = async (entityType: ModeratedEntityType, id: any, associateId: any) => {
  let categoryIds: any[] = entityType === "category" ? [id] : [];
  let subCategoryIds: any[] = entityType === "subCategory" ? [id] : [];
  let productIds: any[] = entityType === "product" ? [id] : [];
  let variantIds: any[] = entityType === "productVariant" ? [id] : [];
  if (categoryIds.length) subCategoryIds = await SubCategoryModel.find({ category: { $in: categoryIds }, createdByAssociate: associateId, approvalStatus: { $ne: "APPROVED" }, isDeleted: { $ne: true } }).distinct("_id");
  if (subCategoryIds.length) productIds = await ProductModel.find({ subCategory: { $in: subCategoryIds }, createdByAssociate: associateId, approvalStatus: { $ne: "APPROVED" }, isDeleted: { $ne: true } }).distinct("_id");
  if (productIds.length) variantIds = await ProductVariantModel.find({ product: { $in: productIds }, createdByAssociate: associateId, approvalStatus: { $ne: "APPROVED" }, isDeleted: { $ne: true } }).distinct("_id");
  const rateIds = variantIds.length ? await VariantRateModel.find({ productVariant: { $in: variantIds }, associate: associateId, isDeleted: { $ne: true } }).distinct("_id") : [];
  return { categoryIds, subCategoryIds, productIds, variantIds, rateIds };
};

const publicFields = (row: any) => ({
  name: row?.name, description: row?.description, category: row?.category,
  subCategory: row?.subCategory, product: row?.product,
});

const notifyAdmins = async (entityType: string, entityId: any, label: string) => {
  const admins = await AdminModel.find({ isActive: true, isDeleted: { $ne: true } }).select("_id").lean();
  if (!admins.length) return;
  await NotificationModel.insertMany(admins.map((admin: any) => ({
    recipientUserId: admin._id, recipientRole: "Admin", type: "APPROVAL_REQUESTED",
    title: "Catalog approval requested", message: `${label} was submitted for catalog approval.`,
    entityType: "APPROVAL", entityId, route: "/dashboard/approvals?workflow=catalog", priority: "high",
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
      if (String(row.approvalStatus || "APPROVED") === "APPROVED") throw lockedError();
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
      if (String(row.approvalStatus || "APPROVED") === "APPROVED") throw lockedError();
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
        return [entityType, await Promise.all(rows.map(async row => {
          const chain: any = await getCatalogChain(entityType, row);
          const variantIds = entityType === "productVariant" ? [row._id] : entityType === "product" ? await ProductVariantModel.find({ product: row._id, isDeleted: { $ne: true } }).distinct("_id") : [];
          const listingCount = variantIds.length ? await VariantRateModel.countDocuments({ productVariant: { $in: variantIds }, associate: context.associateId, isDeleted: { $ne: true } }) : 0;
          return { ...row, hierarchy: Object.fromEntries(Object.entries(chain).map(([key, value]: any) => [key, value ? { _id: value._id, name: value.name, approvalStatus: value.approvalStatus || "APPROVED" } : null])), listingCount, moderation: await catalogModerationSummary(entityType, row) };
        }))] as const;
      }));
      return res.json({ success: true, data: Object.fromEntries(groups) });
    } catch (error) { next(error); }
  }

  async deletePreview(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const context = await getApprovedAssociateContext(String(req.user?.id || ""));
      const row: any = await MODERATED_ENTITY_MODELS[entityType].findOne({ _id: req.params.id, ...ownerQuery(String(context.associateId)), isDeleted: { $ne: true } }).lean();
      if (!row) return res.status(404).json({ success: false, message: "Catalog addition was not found." });
      if (String(row.approvalStatus || "APPROVED") === "APPROVED") throw lockedError();
      const ids = await dependencyIds(entityType, row._id, context.associateId);
      return res.json({ success: true, data: { item: { id: row._id, name: row.name, entityType }, counts: { categories: ids.categoryIds.length, subCategories: ids.subCategoryIds.length, products: ids.productIds.length, variants: ids.variantIds.length, listings: ids.rateIds.length } } });
    } catch (error) { next(error); }
  }

  async removeDraft(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.body?.confirm !== true) return res.status(400).json({ success: false, message: "Deletion confirmation is required." });
      const entityType = parseEntityType(req.params.entityType);
      const context = await getApprovedAssociateContext(String(req.user?.id || ""));
      const model = MODERATED_ENTITY_MODELS[entityType];
      const row: any = await model.findOne({ _id: req.params.id, ...ownerQuery(String(context.associateId)), isDeleted: { $ne: true } });
      if (!row) return res.status(404).json({ success: false, message: "Catalog addition was not found." });
      if (String(row.approvalStatus || "APPROVED") === "APPROVED") throw lockedError();
      const ids = await dependencyIds(entityType, row._id, context.associateId);
      await Promise.all([
        ids.categoryIds.length && CategoryModel.updateMany({ _id: { $in: ids.categoryIds } }, { $set: { isDeleted: true } }),
        ids.subCategoryIds.length && SubCategoryModel.updateMany({ _id: { $in: ids.subCategoryIds } }, { $set: { isDeleted: true } }),
        ids.productIds.length && ProductModel.updateMany({ _id: { $in: ids.productIds } }, { $set: { isDeleted: true } }),
        ids.variantIds.length && ProductVariantModel.updateMany({ _id: { $in: ids.variantIds } }, { $set: { isDeleted: true, isAvailable: false } }),
        ids.rateIds.length && VariantRateModel.updateMany({ _id: { $in: ids.rateIds } }, { $set: { isDeleted: true, isLive: false, unpublishedAt: new Date() } }),
      ]);
      await CatalogModerationAuditModel.create({ entityType, entityId: row._id, action: "DELETE", before: publicFields(row), actorId: context.associateId, actorRole: "Associate" });
      return res.json({ success: true, data: { deleted: ids }, message: "Private catalog addition and its private dependants were removed." });
    } catch (error) { next(error); }
  }

  async listApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const page = positiveInt(req.query.page, 1, 100000); const limit = positiveInt(req.query.limit, 20, 100);
      const status = String(req.query.status || "PENDING_REVIEW").toUpperCase();
      const model = MODERATED_ENTITY_MODELS[entityType];
      const entityQuery: any = { approvalStatus: status };
      if (req.query.associateId && mongoose.Types.ObjectId.isValid(String(req.query.associateId))) entityQuery.createdByAssociate = req.query.associateId;
      if (req.query.companyId && mongoose.Types.ObjectId.isValid(String(req.query.companyId))) entityQuery.createdByCompany = req.query.companyId;
      if (String(req.query.search || "").trim()) entityQuery.name = { $regex: String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      const [entities, revisions] = await Promise.all([
        model.find(entityQuery).populate("createdByAssociate", "name email").populate("createdByCompany", "name").lean(),
        CatalogRevisionModel.find({ entityType, status }).populate("createdByAssociate", "name email").populate("createdByCompany", "name").lean(),
      ]);
      const enrichedEntities = await Promise.all(entities.map(async (row: any) => {
        const chain: any = await getCatalogChain(entityType, row);
        const variantIds = entityType === "productVariant" ? [row._id] : entityType === "product" ? await ProductVariantModel.find({ product: row._id, isDeleted: { $ne: true } }).distinct("_id") : [];
        const listingCount = variantIds.length ? await VariantRateModel.countDocuments({ productVariant: { $in: variantIds }, isDeleted: { $ne: true } }) : 0;
        return { ...row, sourceKind: "ENTITY", hierarchy: Object.fromEntries(Object.entries(chain).map(([key, value]: any) => [key, value ? { _id: value._id, name: value.name, approvalStatus: value.approvalStatus || "APPROVED" } : null])), listingCount };
      }));
      const combined = [
        ...enrichedEntities,
        ...revisions.map((row: any) => ({ ...row, sourceKind: "REVISION" })),
      ].sort((a: any, b: any) => new Date(b.approvalRequestedAt || b.createdAt).getTime() - new Date(a.approvalRequestedAt || a.createdAt).getTime());
      const start = (page - 1) * limit;
      return res.json({ success: true, data: combined.slice(start, start + limit), meta: { page, limit, total: combined.length, pages: Math.max(1, Math.ceil(combined.length / limit)) } });
    } catch (error) { next(error); }
  }

  async audit(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const rows = await CatalogModerationAuditModel.find({ entityType, entityId: req.params.id }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async adminEdit(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const model = MODERATED_ENTITY_MODELS[entityType];
      const row: any = await model.findOne({ _id: req.params.id, approvalStatus: { $in: ["DRAFT", "PENDING_REVIEW", "REJECTED"] }, isDeleted: { $ne: true } });
      if (!row) return res.status(404).json({ success: false, message: "Editable catalog submission was not found." });
      const changes = pickEntityFields(entityType, req.body);
      const merged = { ...row.toObject(), ...changes };
      await assertAccessibleParent(entityType, merged, String(row.createdByAssociate || ""));
      await assertNoDuplicate(entityType, merged, String(row._id));
      const before = publicFields(row.toObject());
      Object.assign(row, changes); await row.save();
      await CatalogModerationAuditModel.create({ entityType, entityId: row._id, action: "ADMIN_EDIT", before, after: publicFields(row.toObject()), notes: String(req.body?.notes || ""), actorId: req.user?.id, actorRole: "Admin" });
      return res.json({ success: true, data: row, message: "Submission updated with an audit record." });
    } catch (error) { next(error); }
  }

  async approveChain(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType = parseEntityType(req.params.entityType);
      const target: any = await MODERATED_ENTITY_MODELS[entityType].findOne({ _id: req.params.id, isDeleted: { $ne: true } });
      if (!target) return res.status(404).json({ success: false, message: "Catalog submission was not found." });
      const chain: any = await getCatalogChain(entityType, target);
      const ordered: Array<[ModeratedEntityType, any]> = [["category", chain.category], ["subCategory", chain.subCategory], ["product", chain.product], ["productVariant", chain.productVariant]];
      const approved: any[] = [];
      for (const [type, source] of ordered) {
        if (!source || String(source.approvalStatus || "APPROVED") === "APPROVED") continue;
        if (String(source.createdByAssociate || "") !== String(target.createdByAssociate || "")) return res.status(409).json({ success: false, message: "The chain contains an unapproved item owned by another Associate." });
        const row: any = await MODERATED_ENTITY_MODELS[type].findById(source._id);
        row.approvalStatus = "APPROVED"; row.approvedAt = new Date(); row.approvedBy = req.user?.id; row.reviewNotes = ""; await row.save();
        await CatalogModerationAuditModel.create({ entityType: type, entityId: row._id, action: "APPROVE", before: { approvalStatus: source.approvalStatus }, after: { approvalStatus: "APPROVED" }, notes: String(req.body?.notes || ""), actorId: req.user?.id, actorRole: "Admin" });
        await notifyAssociate(row, type, "APPROVE"); approved.push({ entityType: type, id: row._id });
      }
      return res.json({ success: true, data: { approved }, message: "Catalog chain approved in dependency order." });
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
      if (action === "APPROVE") {
        const parent = await getParent(entityType, row.toObject());
        if (parent) {
          const parentRow: any = await MODERATED_ENTITY_MODELS[parent.type].findById(parent.id).select("approvalStatus").lean();
          if (!parentRow || String(parentRow.approvalStatus || "APPROVED") !== "APPROVED") return res.status(409).json({ success: false, message: "Approve the parent first, or use Approve chain." });
        }
      }
      const before = { approvalStatus: row.approvalStatus, reviewNotes: row.reviewNotes };
      row.approvalStatus = action === "APPROVE" ? "APPROVED" : "REJECTED"; row.reviewNotes = notes;
      if (action === "APPROVE") { row.approvedAt = new Date(); row.approvedBy = req.user?.id; }
      await row.save();
      await CatalogModerationAuditModel.create({ entityType, entityId: row._id, action: action === "APPROVE" ? "APPROVE" : "REJECT", before, after: { approvalStatus: row.approvalStatus, reviewNotes: row.reviewNotes }, notes, actorId: req.user?.id, actorRole: "Admin" });
      await notifyAssociate(row, entityType, action);
      return res.json({ success: true, data: row });
    } catch (error) { next(error); }
  }
}

export const catalogModerationController = new CatalogModerationController();
