import { Request, Response } from "express";
import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyInterestProfileModel } from "../database/models/companyInterestProfile";
import { normalizeCompanyInterests } from "../constants/companyInterests";
import { InquiryModel } from "../database/models/enquiry";
import { VariantRateModel } from "../database/models/variantRate";
import { InquiryStatus } from "../core/inquiry/inquiryStateMachine";
import { createInquiryEvent, InquiryEventType } from "../database/models/InquiryEvent";
import { notificationService } from "../services/notificationService";
import { NotificationEntityTypes, NotificationTypes } from "../constants/notificationTypes";
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

      if (actionType === "APPLY_COMPANY_INTERESTS") {
        const requestedInterests = normalizeCompanyInterests((report as any)?.payload?.requestedInterests);
        if (!requestedInterests.length) {
          return res.status(400).json({
            success: false,
            message: "No valid requestedInterests found in report payload.",
          });
        }

        const targetCompanyId = String((report as any)?.targetCompanyId || "");
        if (!mongoose.Types.ObjectId.isValid(targetCompanyId)) {
          return res.status(400).json({ success: false, message: "Invalid target company for report." });
        }

        const company = await AssociateCompanyModel.findOne({
          _id: targetCompanyId,
          isDeleted: { $ne: true },
        })
          .select("_id")
          .lean();
        if (!company) {
          return res.status(404).json({ success: false, message: "Target company not found." });
        }

        await CompanyInterestProfileModel.findOneAndUpdate(
          { associateCompanyId: targetCompanyId },
          {
            $set: {
              interests: requestedInterests,
              isConfigured: requestedInterests.length > 0,
              updatedBy: reviewedBy || null,
              updatedByRole: req.user?.role || null,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await AssociateCompanyModel.findByIdAndUpdate(targetCompanyId, {
          $set: { serviceCapabilities: requestedInterests },
        });
      }

      let reopenedInquiryId: string | null = null;
      if (actionType === "REOPEN_INQUIRY_CREATE") {
        if (String((report as any)?.reasonCode || "").toUpperCase() !== "REOPEN_INQUIRY_REQUEST") {
          return res.status(400).json({ success: false, message: "Reopen action is only valid for reopen requests." });
        }

        const inquiryId = String((report as any)?.payload?.inquiryId || "");
        if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
          return res.status(400).json({ success: false, message: "Invalid inquiryId in report payload." });
        }

        const existingInquiry = await InquiryModel.findById(inquiryId).lean();
        if (!existingInquiry) {
          return res.status(404).json({ success: false, message: "Original enquiry not found." });
        }
        if (String((existingInquiry as any)?.status || "").toUpperCase() !== "CANCELLED") {
          return res.status(400).json({ success: false, message: "Only cancelled enquiries can be reopened." });
        }

        const variantRateId = String((existingInquiry as any)?.variantRateId || "");
        if (!mongoose.Types.ObjectId.isValid(variantRateId)) {
          return res.status(400).json({ success: false, message: "Variant rate not found for this enquiry." });
        }
        const variantRate = await VariantRateModel.findById(variantRateId).select("_id").lean();
        if (!variantRate) {
          return res.status(400).json({ success: false, message: "Variant rate no longer available. Cannot reopen this enquiry." });
        }

        const created = await InquiryModel.create({
          productId: (existingInquiry as any).productId,
          quantity: (existingInquiry as any).quantity,
          specifications: (existingInquiry as any).specifications,
          packagingSpecifications: (existingInquiry as any).packagingSpecifications,
          buyerAssociateId: (existingInquiry as any).buyerAssociateId,
          sellerAssociateId: (existingInquiry as any).sellerAssociateId,
          mediatorAssociateId: (existingInquiry as any).mediatorAssociateId,
          assignedOperatorId: (existingInquiry as any).assignedOperatorId || null,
          variantRateId: (existingInquiry as any).variantRateId,
          catalogItemId: (existingInquiry as any).catalogItemId,
          preferredIncoterm: (existingInquiry as any).preferredIncoterm || null,
          paymentTermId: (existingInquiry as any).paymentTermId || null,
          supplierCommitUntil: null,
          rate: (existingInquiry as any).rate || 0,
          adminCommission: (existingInquiry as any).adminCommission || 0,
          mediatorCommission: (existingInquiry as any).mediatorCommission || 0,
          executionContext: (existingInquiry as any).executionContext || {},
          responsibilityPlan: (existingInquiry as any).responsibilityPlan || {},
          status: InquiryStatus.NEW,
          workflowStage: "INQUIRY_CREATED",
          createdBy: req.user?.id,
        });

        reopenedInquiryId = String(created?._id || "");
        const actorId = req.user?.id || created.createdBy;
        if (reopenedInquiryId && actorId) {
          await createInquiryEvent(created._id, InquiryEventType.CREATED, actorId, {
            metadata: { action: "REOPENED_FROM_CANCELLED", sourceInquiryId: inquiryId },
          });
        }
      }

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
      if (reopenedInquiryId) {
        updateDoc.payload = {
          ...(report as any)?.payload,
          reopenedInquiryId,
        };
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

      if (String((report as any)?.reasonCode || "").toUpperCase() === "REOPEN_INQUIRY_REQUEST") {
        const recipientId = String((report as any)?.reporterAssociateId || "");
        const recipientMap = new Map<string, any>();
        if (mongoose.Types.ObjectId.isValid(recipientId)) {
          recipientMap.set(recipientId, "Associate");
        }

        if (actionType === "REOPEN_INQUIRY_CREATE" && reopenedInquiryId) {
          await notificationService.createNotifications({
            recipientMap,
            createdByUserId: req.user?.id,
            type: NotificationTypes.INQUIRY_STATUS_CHANGED,
            title: "Enquiry reopened",
            message: "Your enquiry reopen request was approved. A new enquiry has been created.",
            entityType: NotificationEntityTypes.INQUIRY,
            entityId: reopenedInquiryId,
            route: `/dashboard/enquiries/${reopenedInquiryId}`,
            payload: { sourceReportId: reportId },
            priority: "high",
          });
        } else if (nextStatus === "REJECTED") {
          await notificationService.createNotifications({
            recipientMap,
            createdByUserId: req.user?.id,
            type: NotificationTypes.INQUIRY_STATUS_CHANGED,
            title: "Reopen request rejected",
            message: "Your enquiry reopen request was rejected by admin.",
            entityType: NotificationEntityTypes.APPROVAL,
            entityId: reportId,
            route: `/dashboard/notifications`,
            payload: { sourceReportId: reportId },
            priority: "medium",
          });
        }
      }

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error?.message || "Failed to process organization report action." });
    }
  }
}

export const organizationReportController = new OrganizationReportController();
