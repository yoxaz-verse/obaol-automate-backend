import { Request, Response } from "express";
import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";
import {
  ORGANIZATION_REPORT_ACTIONS,
  ORGANIZATION_REPORT_STATUSES,
  OrganizationReportModel,
} from "../database/models/organizationReport";

const allowedStatuses = new Set<string>([...ORGANIZATION_REPORT_STATUSES]);
const allowedActions = new Set<string>([...ORGANIZATION_REPORT_ACTIONS]);

const normalizeUpper = (value: unknown) => String(value || "").trim().toUpperCase();

export class OrganizationReportController {
  async applyAdminAction(req: Request, res: Response) {
    try {
      const reportId = String(req.params.id || "").trim();
      if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return res.status(400).json({ success: false, message: "Invalid report id." });
      }

      const nextStatusRaw = req.body?.status;
      const actionTypeRaw = req.body?.actionType;
      const adminNotes = String(req.body?.adminNotes || "").trim();
      const nextStatus = nextStatusRaw ? normalizeUpper(nextStatusRaw) : "";
      const actionType = actionTypeRaw ? normalizeUpper(actionTypeRaw) : "NONE";

      if (nextStatus && !allowedStatuses.has(nextStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status value." });
      }
      if (!allowedActions.has(actionType)) {
        return res.status(400).json({ success: false, message: "Invalid actionType value." });
      }

      const report = await OrganizationReportModel.findOne({
        _id: reportId,
        isDeleted: { $ne: true },
      }).lean();
      if (!report) {
        return res.status(404).json({ success: false, message: "Organization report not found." });
      }

      if (actionType === "DEACTIVATE_ASSOCIATE" || actionType === "REMOVE_FROM_COMPANY") {
        const targetAssociateId = String((report as any)?.targetAssociateId || "");
        if (!mongoose.Types.ObjectId.isValid(targetAssociateId)) {
          return res.status(400).json({ success: false, message: "Invalid report target associate." });
        }

        const targetFilter = { _id: targetAssociateId, isDeleted: { $ne: true } };
        const targetUpdate =
          actionType === "DEACTIVATE_ASSOCIATE"
            ? { $set: { isActive: false } }
            : {
                $set: {
                  associateCompany: null,
                  hasCompany: false,
                  companyMode: "none",
                },
              };

        const targetResult = await AssociateModel.findOneAndUpdate(targetFilter, targetUpdate, {
          new: true,
        })
          .select("_id")
          .lean();
        if (!targetResult) {
          return res.status(404).json({ success: false, message: "Target associate not found." });
        }
      }

      const reviewedBy =
        mongoose.Types.ObjectId.isValid(String(req.user?.id || ""))
          ? new mongoose.Types.ObjectId(String(req.user?.id))
          : undefined;

      const updateDoc: any = {
        actionType,
        reviewedAt: new Date(),
      };
      if (reviewedBy) {
        updateDoc.reviewedBy = reviewedBy;
      }
      if (adminNotes) {
        updateDoc.adminNotes = adminNotes;
      }

      if (nextStatus) {
        updateDoc.status = nextStatus;
      } else if (actionType !== "NONE") {
        updateDoc.status = "ACTION_TAKEN";
      }

      const updated = await OrganizationReportModel.findOneAndUpdate(
        { _id: reportId, isDeleted: { $ne: true } },
        { $set: updateDoc },
        { new: true }
      )
        .populate("reporterAssociateId", "name email")
        .populate("targetAssociateId", "name email")
        .populate("reporterCompanyId", "name")
        .lean();

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error?.message || "Failed to process organization report action." });
    }
  }
}

export const organizationReportController = new OrganizationReportController();
