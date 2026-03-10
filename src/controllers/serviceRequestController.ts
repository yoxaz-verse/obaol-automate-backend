import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { ServiceRequestModel, SERVICE_REQUEST_STATUSES, SERVICE_REQUEST_TYPES } from "../database/models/serviceRequest";
import {
  matchesRequestTypeByCapabilities,
  normalizeCapabilities,
  requestTypeToCapabilityAliases,
  supportedRequestTypesForCapabilities,
} from "../utils/companyCapabilities";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isEmployeeRole = (role: string) => role === "employee" || role === "team";
const isAssociateRole = (role: string) => role === "associate";

const toObjectId = (value: any) => {
  if (!Types.ObjectId.isValid(String(value || ""))) return null;
  return new Types.ObjectId(String(value));
};

export class ServiceRequestController {
  private async resolveAssociateContext(userId: string) {
    const associate = await AssociateModel.findById(userId)
      .select("_id associateCompany")
      .lean();
    return {
      associateId: associate?._id ? String(associate._id) : "",
      associateCompanyId: associate?.associateCompany ? String(associate.associateCompany) : "",
    };
  }

  private async getCandidateProviderIds(requestType: string): Promise<string[]> {
    const aliases = requestTypeToCapabilityAliases(requestType);
    if (!aliases.length) return [];
    const accepted = new Set(aliases);
    const rows = await AssociateCompanyModel.find({
      isDeleted: { $ne: true },
    })
      .select("_id serviceCapabilities")
      .limit(10000)
      .lean();
    const matched = rows
      .filter((row: any) => normalizeCapabilities(row?.serviceCapabilities).some((capability) => accepted.has(capability)))
      .map((row: any) => String(row._id));
    if (process.env.NODE_ENV !== "production") {
      console.debug("[service-requests] candidate-resolution", {
        requestType: String(requestType || "").toUpperCase(),
        aliases: Array.from(accepted),
        matchedCount: matched.length,
      });
    }
    return matched;
  }

  private async getAssociateCompanyCapabilities(companyId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(String(companyId || ""))) return [];
    const company = await AssociateCompanyModel.findById(companyId)
      .select("serviceCapabilities")
      .lean();
    return normalizeCapabilities(company?.serviceCapabilities);
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });

      if (!(isAdminRole(role) || isEmployeeRole(role) || isAssociateRole(role))) {
        return res.status(403).json({ success: false, message: "Not allowed to create service requests." });
      }

      const requestType = String(req.body?.requestType || "").toUpperCase();
      if (!SERVICE_REQUEST_TYPES.includes(requestType as any)) {
        return res.status(400).json({ success: false, message: "Invalid requestType." });
      }

      const title = String(req.body?.title || "").trim();
      const serviceSpecifications = String(req.body?.serviceSpecifications || "").trim();
      const fromState = toObjectId(req.body?.fromState);
      const fromDistrict = toObjectId(req.body?.fromDistrict);
      const toState = toObjectId(req.body?.toState);
      const toDistrict = toObjectId(req.body?.toDistrict);
      const requiredFromDate = req.body?.requiredFromDate ? new Date(req.body.requiredFromDate) : null;
      const requiredToDate = req.body?.requiredToDate ? new Date(req.body.requiredToDate) : null;

      if (!title) return res.status(400).json({ success: false, message: "title is required." });
      if (!serviceSpecifications) return res.status(400).json({ success: false, message: "serviceSpecifications is required." });
      if (!fromState || !fromDistrict) {
        return res.status(400).json({ success: false, message: "fromState and fromDistrict are required." });
      }
      if (requiredFromDate && Number.isNaN(requiredFromDate.getTime())) {
        return res.status(400).json({ success: false, message: "requiredFromDate is invalid." });
      }
      if (requiredToDate && Number.isNaN(requiredToDate.getTime())) {
        return res.status(400).json({ success: false, message: "requiredToDate is invalid." });
      }
      if (requiredFromDate && requiredToDate && requiredFromDate > requiredToDate) {
        return res.status(400).json({ success: false, message: "requiredFromDate cannot be after requiredToDate." });
      }

      let createdByAssociateId: string | null = null;
      let createdByCompanyId: string | null = null;
      if (isAssociateRole(role)) {
        const context = await this.resolveAssociateContext(userId);
        if (!context.associateId || !context.associateCompanyId) {
          return res.status(403).json({ success: false, message: "Associate company context required to create service request." });
        }
        createdByAssociateId = context.associateId;
        createdByCompanyId = context.associateCompanyId;
      } else if (isAdminRole(role) || isEmployeeRole(role)) {
        const suppliedCompanyId = toObjectId(req.body?.createdByCompanyId);
        if (req.body?.createdByCompanyId && !suppliedCompanyId) {
          return res.status(400).json({ success: false, message: "createdByCompanyId must be a valid company id." });
        }
        if (suppliedCompanyId) {
          const company = await AssociateCompanyModel.findOne({
            _id: suppliedCompanyId,
            isDeleted: { $ne: true },
          })
            .select("_id")
            .lean();
          if (!company) {
            return res.status(404).json({ success: false, message: "Selected company not found." });
          }
          createdByCompanyId = String(suppliedCompanyId);
        }
      }

      const candidateProviders = await this.getCandidateProviderIds(requestType);

      const created = await ServiceRequestModel.create({
        requestType,
        title,
        serviceSpecifications,
        fromState,
        fromDistrict,
        toState,
        toDistrict,
        requiredFromDate,
        requiredToDate,
        createdByUserId: userId,
        createdByRole: req.user?.role || "",
        createdByAssociateId,
        createdByCompanyId,
        status: "OPEN",
        candidateProviders,
        bids: [],
        committedProvider: null,
        bidAmount: null,
        commitNote: "",
        committedAt: null,
      });

      const populated = await ServiceRequestModel.findById(created._id)
        .populate("fromState", "name")
        .populate("fromDistrict", "name")
        .populate("toState", "name")
        .populate("toDistrict", "name")
        .populate("createdByCompanyId", "name email phone")
        .populate("candidateProviders", "name email phone serviceCapabilities")
        .lean();

      return res.status(201).json({ success: true, data: populated });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const page = Math.max(parseInt(String(req.query?.page || "1"), 10), 1);
      const limit = Math.min(Math.max(parseInt(String(req.query?.limit || "20"), 10), 1), 200);
      const status = String(req.query?.status || "").toUpperCase();
      const requestType = String(req.query?.requestType || "").toUpperCase();

      const query: any = { isDeleted: { $ne: true } };
      if (status && SERVICE_REQUEST_STATUSES.includes(status as any)) query.status = status;
      if (requestType && SERVICE_REQUEST_TYPES.includes(requestType as any)) query.requestType = requestType;

      if (isAssociateRole(role)) {
        const context = await this.resolveAssociateContext(userId);
        if (!context.associateId) return res.status(403).json({ success: false, message: "Associate context not found." });
        const companyCapabilities = context.associateCompanyId
          ? await this.getAssociateCompanyCapabilities(context.associateCompanyId)
          : [];
        const requestTypesByCapability = supportedRequestTypesForCapabilities(companyCapabilities);

        query.$or = [{ createdByAssociateId: context.associateId }];
        if (context.associateCompanyId) {
          query.$or.push({ candidateProviders: context.associateCompanyId });
        }
        if (requestTypesByCapability.length) {
          if (requestType && SERVICE_REQUEST_TYPES.includes(requestType as any)) {
            if (requestTypesByCapability.includes(requestType)) {
              query.$or.push({ requestType });
            }
          } else {
            query.$or.push({ requestType: { $in: requestTypesByCapability } });
          }
        }
      } else if (!(isAdminRole(role) || isEmployeeRole(role))) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const [rows, total] = await Promise.all([
        ServiceRequestModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("fromState", "name")
          .populate("fromDistrict", "name")
          .populate("toState", "name")
          .populate("toDistrict", "name")
          .populate("createdByCompanyId", "name email phone")
          .populate("candidateProviders", "name email phone serviceCapabilities")
          .populate("committedProvider", "name email phone serviceCapabilities")
          .populate("bids.company", "name email phone serviceCapabilities")
          .lean(),
        ServiceRequestModel.countDocuments(query),
      ]);

      if (isAssociateRole(role)) {
        const context = await this.resolveAssociateContext(userId);
        const companyCapabilities = context.associateCompanyId
          ? await this.getAssociateCompanyCapabilities(context.associateCompanyId)
          : [];
        if (context.associateCompanyId && companyCapabilities.length) {
          rows.forEach((row: any) => {
            const candidates = Array.isArray(row?.candidateProviders) ? row.candidateProviders : [];
            const hasCandidate = candidates.some(
              (provider: any) => String(provider?._id || provider || "") === context.associateCompanyId
            );
            if (!hasCandidate && matchesRequestTypeByCapabilities(row?.requestType, companyCapabilities)) {
              row.candidateProviders = [...candidates, context.associateCompanyId];
            }
          });
        }
      }

      return res.json({
        success: true,
        data: {
          data: rows,
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid service request ID." });
      }

      const row = await ServiceRequestModel.findOne({ _id: id, isDeleted: { $ne: true } })
        .populate("fromState", "name")
        .populate("fromDistrict", "name")
        .populate("toState", "name")
        .populate("toDistrict", "name")
        .populate("createdByCompanyId", "name email phone")
        .populate("candidateProviders", "name email phone serviceCapabilities")
        .populate("committedProvider", "name email phone serviceCapabilities")
        .populate("bids.company", "name email phone serviceCapabilities");
      if (!row) return res.status(404).json({ success: false, message: "Service request not found." });

      if (isAssociateRole(role)) {
        const context = await this.resolveAssociateContext(userId);
        let canRead =
          String((row as any).createdByAssociateId || "") === context.associateId ||
          (context.associateCompanyId &&
            Array.isArray((row as any).candidateProviders) &&
            (row as any).candidateProviders.some((company: any) => String(company?._id || company) === context.associateCompanyId));
        if (!canRead && context.associateCompanyId) {
          const companyCapabilities = await this.getAssociateCompanyCapabilities(context.associateCompanyId);
          canRead = matchesRequestTypeByCapabilities((row as any)?.requestType, companyCapabilities);
        }
        if (!canRead) return res.status(403).json({ success: false, message: "Access denied." });
      } else if (!(isAdminRole(role) || isEmployeeRole(role))) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      return res.json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  }

  async bid(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid service request ID." });
      }

      const row = await ServiceRequestModel.findOne({ _id: id, isDeleted: { $ne: true } });
      if (!row) return res.status(404).json({ success: false, message: "Service request not found." });

      const amount = Number(req.body?.amount);
      const note = String(req.body?.note || "").trim();
      if (Number.isNaN(amount) || amount < 0) {
        return res.status(400).json({ success: false, message: "amount must be a valid non-negative number." });
      }

      let bidCompanyId = "";
      if (isAssociateRole(role)) {
        const context = await this.resolveAssociateContext(userId);
        bidCompanyId = context.associateCompanyId;
        if (!bidCompanyId) return res.status(403).json({ success: false, message: "Associate company context required." });
        let allowed = Array.isArray((row as any).candidateProviders)
          ? (row as any).candidateProviders.some((provider: any) => String(provider) === bidCompanyId)
          : false;
        if (!allowed) {
          const companyCapabilities = await this.getAssociateCompanyCapabilities(bidCompanyId);
          allowed = matchesRequestTypeByCapabilities((row as any)?.requestType, companyCapabilities);
          if (allowed) {
            const candidates = Array.isArray((row as any).candidateProviders) ? (row as any).candidateProviders : [];
            (row as any).candidateProviders = candidates.some((provider: any) => String(provider) === bidCompanyId)
              ? candidates
              : [...candidates, bidCompanyId];
          }
        }
        if (!allowed) {
          return res.status(403).json({ success: false, message: "Your company is not a candidate for this request." });
        }
      } else if (isAdminRole(role) || isEmployeeRole(role)) {
        bidCompanyId = String(req.body?.companyId || "");
        if (!Types.ObjectId.isValid(bidCompanyId)) {
          return res.status(400).json({ success: false, message: "companyId is required for admin/employee bidding." });
        }
      } else {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const now = new Date();
      const bids = Array.isArray((row as any).bids) ? (row as any).bids : [];
      const existingIndex = bids.findIndex((bid: any) => String(bid?.company || "") === bidCompanyId);
      const payload = {
        company: bidCompanyId,
        amount,
        note,
        status: "SUBMITTED",
        createdBy: isAssociateRole(role) ? userId : null,
        createdAt: now,
        updatedAt: now,
      };
      if (existingIndex >= 0) {
        bids[existingIndex] = {
          ...bids[existingIndex],
          ...payload,
          createdAt: bids[existingIndex]?.createdAt || now,
        };
      } else {
        bids.push(payload);
      }

      (row as any).bids = bids;
      (row as any).status = (row as any).status === "OPEN" ? "IN_PROGRESS" : (row as any).status;
      await row.save();

      return res.json({ success: true, data: row, message: "Bid submitted." });
    } catch (error) {
      next(error);
    }
  }

  async commit(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid service request ID." });
      }

      const row = await ServiceRequestModel.findOne({ _id: id, isDeleted: { $ne: true } });
      if (!row) return res.status(404).json({ success: false, message: "Service request not found." });

      if (!isAdminRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      const commitCompanyId = String(req.body?.committedProvider || "");

      if (!Types.ObjectId.isValid(commitCompanyId)) {
        return res.status(400).json({ success: false, message: "committedProvider is required." });
      }

      const isCandidate = Array.isArray((row as any).candidateProviders)
        ? (row as any).candidateProviders.some((provider: any) => String(provider) === commitCompanyId)
        : false;
      let candidateAllowed = isCandidate;
      if (!candidateAllowed && Types.ObjectId.isValid(commitCompanyId)) {
        const companyCapabilities = await this.getAssociateCompanyCapabilities(commitCompanyId);
        candidateAllowed = matchesRequestTypeByCapabilities((row as any)?.requestType, companyCapabilities);
      }
      if (!candidateAllowed) {
        return res.status(400).json({ success: false, message: "Committed provider is not a candidate." });
      }
      if (!isCandidate) {
        const candidates = Array.isArray((row as any).candidateProviders) ? (row as any).candidateProviders : [];
        (row as any).candidateProviders = candidates.some((provider: any) => String(provider) === commitCompanyId)
          ? candidates
          : [...candidates, commitCompanyId];
      }

      (row as any).committedProvider = commitCompanyId;
      const incomingBidAmount = Number(req.body?.bidAmount);
      if (typeof req.body?.bidAmount === "number" && !Number.isNaN(req.body.bidAmount)) {
        (row as any).bidAmount = req.body.bidAmount;
      } else {
        const winningBid = Array.isArray((row as any).bids)
          ? (row as any).bids.find((bid: any) => String(bid?.company || "") === commitCompanyId)
          : null;
        const winningAmount = Number(winningBid?.amount);
        if (!Number.isNaN(winningAmount)) {
          (row as any).bidAmount = winningAmount;
        } else if (!Number.isNaN(incomingBidAmount)) {
          (row as any).bidAmount = incomingBidAmount;
        }
      }
      if (typeof req.body?.commitNote === "string") {
        (row as any).commitNote = String(req.body.commitNote).trim();
      }
      (row as any).status = "COMPLETED";
      (row as any).committedAt = new Date();

      const bids = Array.isArray((row as any).bids) ? (row as any).bids : [];
      (row as any).bids = bids.map((bid: any) => ({
        ...bid,
        status: String(bid?.company || "") === commitCompanyId ? "AWARDED" : bid?.status || "SUBMITTED",
        updatedAt: new Date(),
      }));

      await row.save();

      return res.json({ success: true, data: row, message: "Service request committed." });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const role = normalizeRole(req.user?.role);
      const userId = String(req.user?.id || "").trim();
      const id = String(req.params?.id || "");
      const status = String(req.body?.status || "").toUpperCase();

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid service request ID." });
      }
      if (!SERVICE_REQUEST_STATUSES.includes(status as any)) {
        return res.status(400).json({ success: false, message: "Invalid status." });
      }

      const row = await ServiceRequestModel.findOne({ _id: id, isDeleted: { $ne: true } });
      if (!row) return res.status(404).json({ success: false, message: "Service request not found." });

      if (!isAdminRole(role)) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }

      (row as any).status = status;
      if (status === "COMPLETED") (row as any).committedAt = new Date();
      await row.save();

      return res.json({ success: true, data: row, message: "Service request status updated." });
    } catch (error) {
      next(error);
    }
  }
}
