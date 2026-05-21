import { Request, Response } from "express";
import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { OperatorModel } from "../database/models/operator";
import { CatalogItemModel } from "../database/models/catalogItem";
import { WarehouseModel } from "../database/models/warehouse";

const ALLOWED_STATUSES = new Set(["PENDING_REVIEW", "APPROVED", "REJECTED"]);

const normalizeStatus = (value: any): string | null => {
  const normalized = String(value || "").trim().toUpperCase();
  return ALLOWED_STATUSES.has(normalized) ? normalized : null;
};

const buildSearch = (search: any, fields: string[]) => {
  const value = String(search || "").trim();
  if (!value) return null;
  const regex = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
};

export class ApprovalController {
  private async activateDraftListings(params: {
    adminId?: string;
    associateId?: string | null;
    associateCompanyId?: string | null;
  }) {
    const hasAssociateTarget = Boolean(params.associateId && mongoose.Types.ObjectId.isValid(String(params.associateId)));
    const hasCompanyTarget = Boolean(params.associateCompanyId && mongoose.Types.ObjectId.isValid(String(params.associateCompanyId)));
    if (!hasAssociateTarget && !hasCompanyTarget) return;

    const now = new Date();
    const approvedByObjectId =
      mongoose.Types.ObjectId.isValid(String(params.adminId || ""))
        ? new mongoose.Types.ObjectId(String(params.adminId))
        : null;

    const catalogFilter: any = { listingState: "DRAFT" };
    const warehouseFilter: any = { listingState: "DRAFT" };
    const companyFilter: any = { labListingState: "DRAFT" };

    if (hasAssociateTarget && params.associateId) {
      const associateObjectId = new mongoose.Types.ObjectId(params.associateId);
      catalogFilter.associateId = associateObjectId;
      warehouseFilter.ownerAssociateId = associateObjectId;
    }
    if (hasCompanyTarget && params.associateCompanyId) {
      const companyObjectId = new mongoose.Types.ObjectId(params.associateCompanyId);
      catalogFilter.associateCompanyId = companyObjectId;
      warehouseFilter.ownerCompanyId = companyObjectId;
      companyFilter._id = companyObjectId;
    }

    await Promise.all([
      CatalogItemModel.updateMany(catalogFilter, {
        $set: {
          listingState: "LIVE",
          isLive: true,
          activatedAt: now,
          ...(approvedByObjectId ? { activatedBy: approvedByObjectId } : {}),
        },
      }),
      WarehouseModel.updateMany(warehouseFilter, {
        $set: {
          listingState: "LIVE",
          isActive: true,
          activatedAt: now,
          ...(approvedByObjectId ? { activatedBy: approvedByObjectId } : {}),
        },
      }),
      hasCompanyTarget ? AssociateCompanyModel.updateMany(companyFilter, {
        $set: {
          labListingState: "LIVE",
          isQualityLabListed: true,
          labActivatedAt: now,
          ...(approvedByObjectId ? { labActivatedBy: approvedByObjectId } : {}),
        },
      }) : Promise.resolve(),
    ]);
  }

  async approveExistingPending(req: Request, res: Response) {
    try {
      const notes = String(req.body?.notes || "Approved in bulk from existing records.").trim();
      const adminId = String(req.user?.id || "");
      const approvedByObjectId =
        mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : undefined;

      const now = new Date();

      // Only move pending/legacy records to APPROVED.
      // Do not force-approve explicit REJECTED records.
      const associateFilter: any = {
        isDeleted: { $ne: true },
        $or: [
          { registrationStatus: { $exists: false } },
          { registrationStatus: null },
          { registrationStatus: "" },
          { registrationStatus: "PENDING_REVIEW" },
        ],
      };

      const companyFilter: any = {
        isDeleted: { $ne: true },
        $or: [
          { registrationStatus: { $exists: false } },
          { registrationStatus: null },
          { registrationStatus: "" },
          { registrationStatus: "PENDING_REVIEW" },
        ],
      };

      const [pendingAssociates, pendingCompanies] = await Promise.all([
        AssociateModel.find(associateFilter).select("_id associateCompany").lean(),
        AssociateCompanyModel.find(companyFilter).select("_id").lean(),
      ]);

      const [associateResult, companyResult] = await Promise.all([
        AssociateModel.updateMany(
          associateFilter,
          {
            $set: {
              registrationStatus: "APPROVED",
              isActive: true,
              isCompanyVerified: true,
              ...(notes ? { onboardingContactNotes: notes } : {}),
            },
          }
        ),
        AssociateCompanyModel.updateMany(
          companyFilter,
          {
            $set: {
              registrationStatus: "APPROVED",
              isApproved: true,
              approvedAt: now,
              approvedBy: approvedByObjectId,
              reviewNotes: notes,
            },
          }
        ),
      ]);

      await Promise.all([
        ...pendingAssociates.map((row: any) =>
          this.activateDraftListings({
            adminId,
            associateId: String(row?._id || ""),
            associateCompanyId: row?.associateCompany ? String(row.associateCompany) : null,
          })
        ),
        ...pendingCompanies.map((row: any) =>
          this.activateDraftListings({
            adminId,
            associateCompanyId: String(row?._id || ""),
          })
        ),
      ]);

      return res.json({
        success: true,
        message: "Existing pending associates and companies approved successfully.",
        data: {
          associatesMatched: associateResult.matchedCount || 0,
          associatesModified: associateResult.modifiedCount || 0,
          companiesMatched: companyResult.matchedCount || 0,
          companiesModified: companyResult.modifiedCount || 0,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to bulk-approve existing records." });
    }
  }

  async listAssociates(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const status = normalizeStatus(req.query.status) || "PENDING_REVIEW";
      const query: any = { isDeleted: { $ne: true }, onboardingComplete: true };
      if (status) query.registrationStatus = status;
      const searchQuery = buildSearch(req.query.search, ["name", "email", "phone"]);
      if (searchQuery) Object.assign(query, searchQuery);

      const [total, rows] = await Promise.all([
        AssociateModel.countDocuments(query),
        AssociateModel.find(query)
          .select("name email phone registrationStatus isActive associateCompany createdAt")
          .populate("associateCompany", "name email registrationStatus isApproved")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      return res.json({
        success: true,
        data: rows,
        meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to load associates." });
    }
  }

  async listOperators(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const status = normalizeStatus(req.query.status) || "PENDING_REVIEW";
      const query: any = { isDeleted: { $ne: true }, onboardingComplete: true };
      if (status) query.registrationStatus = status;
      const searchQuery = buildSearch(req.query.search, ["name", "email", "phone"]);
      if (searchQuery) Object.assign(query, searchQuery);

      const [total, rows] = await Promise.all([
        OperatorModel.countDocuments(query),
        OperatorModel.find(query)
          .select("name email phone registrationStatus isActive jobRole jobType createdAt")
          .populate("jobRole", "name")
          .populate("jobType", "name")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      return res.json({
        success: true,
        data: rows,
        meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to load operators." });
    }
  }

  async actionAssociate(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const action = String(req.body?.action || "").toUpperCase();
      const notes = String(req.body?.notes || "").trim();
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid associate id." });
      }
      if (action !== "APPROVE" && action !== "REJECT") {
        return res.status(400).json({ success: false, message: "Action must be APPROVE or REJECT." });
      }

      const update =
        action === "APPROVE"
          ? {
              registrationStatus: "APPROVED",
              isActive: true,
              isCompanyVerified: true,
              ...(notes ? { onboardingContactNotes: notes } : {}),
            }
          : {
              registrationStatus: "REJECTED",
              isActive: false,
              ...(notes ? { onboardingContactNotes: notes } : {}),
            };

      const updated = await AssociateModel.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        { $set: update },
        { new: true }
      )
        .select("name email registrationStatus isActive")
        .lean();

      if (!updated) {
        return res.status(404).json({ success: false, message: "Associate not found." });
      }
      if (action === "APPROVE") {
        const associateRow = await AssociateModel.findById(id).select("_id associateCompany").lean();
        await this.activateDraftListings({
          adminId: String(req.user?.id || ""),
          associateId: id,
          associateCompanyId: associateRow?.associateCompany ? String(associateRow.associateCompany) : null,
        });
      }
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to update associate status." });
    }
  }

  async actionOperator(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const action = String(req.body?.action || "").toUpperCase();
      const notes = String(req.body?.notes || "").trim();
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid operator id." });
      }
      if (action !== "APPROVE" && action !== "REJECT") {
        return res.status(400).json({ success: false, message: "Invalid action." });
      }

      const now = new Date();
      const update: any = action === "APPROVE"
        ? { registrationStatus: "APPROVED", isActive: true, approvedAt: now, approvedBy: req.user?.id, reviewNotes: notes }
        : { registrationStatus: "REJECTED", isActive: false, reviewNotes: notes };

      const operator = await OperatorModel.findByIdAndUpdate(id, { $set: update }, { new: true })
        .select("name email registrationStatus isActive")
        .lean();

      if (!operator) {
        return res.status(404).json({ success: false, message: "Operator not found." });
      }

      return res.json({ success: true, data: operator });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to update operator status." });
    }
  }

  async listCompanies(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const status = normalizeStatus(req.query.status) || "PENDING_REVIEW";
      const query: any = { isDeleted: { $ne: true } };
      if (status) query.registrationStatus = status;
      const searchQuery = buildSearch(req.query.search, ["name", "email", "phone", "gstin"]);
      if (searchQuery) Object.assign(query, searchQuery);

      // Show pending companies only after the linked supervisor has actually submitted onboarding.
      // This hides draft companies created during signup/onboarding preparation.
      const eligibleSupervisors = await AssociateModel.distinct("_id", {
        isDeleted: { $ne: true },
        onboardingComplete: true,
      });
      query.supervisor = { $in: eligibleSupervisors };

      const [total, rows] = await Promise.all([
        AssociateCompanyModel.countDocuments(query),
        AssociateCompanyModel.find(query)
          .select("name email phone gstin registrationStatus isApproved createdAt companyType")
          .populate("companyType", "name")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      const companyIds = rows.map((row: any) => row._id);
      const counts = await AssociateModel.aggregate([
        { $match: { isDeleted: { $ne: true }, associateCompany: { $in: companyIds } } },
        { $group: { _id: "$associateCompany", count: { $sum: 1 } } },
      ]);
      const countByCompany = new Map(counts.map((x: any) => [String(x._id), Number(x.count || 0)]));
      const enriched = rows.map((row: any) => ({
        ...row,
        associatesCount: countByCompany.get(String(row._id)) || 0,
      }));

      return res.json({
        success: true,
        data: enriched,
        meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to load companies." });
    }
  }

  async actionCompany(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const action = String(req.body?.action || "").toUpperCase();
      const notes = String(req.body?.notes || "").trim();
      const adminId = String(req.user?.id || "");
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid company id." });
      }
      if (action !== "APPROVE" && action !== "REJECT") {
        return res.status(400).json({ success: false, message: "Action must be APPROVE or REJECT." });
      }

      const approvedByObjectId =
        mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : undefined;

      const update =
        action === "APPROVE"
          ? {
              registrationStatus: "APPROVED",
              isApproved: true,
              approvedAt: new Date(),
              approvedBy: approvedByObjectId,
              reviewNotes: notes,
            }
          : {
              registrationStatus: "REJECTED",
              isApproved: false,
              reviewNotes: notes,
            };

      const updated = await AssociateCompanyModel.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        { $set: update },
        { new: true }
      )
        .select("name email registrationStatus isApproved approvedAt reviewNotes")
        .lean();

      if (!updated) {
        return res.status(404).json({ success: false, message: "Company not found." });
      }

      if (action === "APPROVE") {
        await this.activateDraftListings({
          adminId,
          associateCompanyId: id,
        });
      }

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to update company status." });
    }
  }
}

export const approvalController = new ApprovalController();
