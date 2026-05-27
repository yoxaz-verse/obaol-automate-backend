import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { WarehouseModel } from "../database/models/warehouse";
import { getOperatorCompanyScope } from "../core/hooks/operatorScope";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isAssociateRole = (role: string) => role === "associate";
const isOperatorRole = (role: string) => role === "operator" || role === "team";

const toPositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const toPage = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.floor(parsed);
};

const getAssociateCompanyId = async (associateId: string) => {
  if (!Types.ObjectId.isValid(associateId)) return null;
  const row = await AssociateModel.findById(associateId).select("associateCompany").lean();
  const companyId = String((row as any)?.associateCompany || "").trim();
  return Types.ObjectId.isValid(companyId) ? companyId : null;
};

const buildScopedCompanyIds = async (req: Request, role: string): Promise<string[] | null> => {
  const userId = String(req.user?.id || "").trim();
  if (!userId) return [];

  if (isOperatorRole(role)) {
    const scope = await getOperatorCompanyScope(userId);
    return scope.companyIds.map((id) => String(id));
  }

  if (isAssociateRole(role)) {
    const ownCompanyId = await getAssociateCompanyId(userId);
    return ownCompanyId ? [ownCompanyId] : [];
  }

  if (isAdminRole(role)) return null;
  return [];
};

export class DirectoryController {
  async warehousesDirectory(req: Request, res: Response) {
    const role = normalizeRole(req.user?.role);
    if (!isAdminRole(role) && !isOperatorRole(role) && !isAssociateRole(role)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const page = toPage(req.query.page);
    const limit = toPositiveInt(req.query.limit, 200, 1000);
    const scopedCompanyIds = await buildScopedCompanyIds(req, role);

    const query: any = {
      isDeleted: { $ne: true },
      listingType: "RENTAL",
      isRentalActive: true,
      listingState: "LIVE",
      isActive: true,
    };
    if (Array.isArray(scopedCompanyIds)) {
      if (!scopedCompanyIds.length) {
        return res.status(200).json({
          success: true,
          data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
        });
      }
      query.ownerCompanyId = { $in: scopedCompanyIds };
    }

    const projection = {
      _id: 1,
      name: 1,
      address: 1,
      category: 1,
      storageRatePerUnit: 1,
      unit: 1,
      contactPhone: 1,
      contactPhoneSecondary: 1,
      location: 1,
    };

    const [rows, totalCount] = await Promise.all([
      WarehouseModel.find(query, projection)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WarehouseModel.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        data: rows,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  }

  async labsDirectory(req: Request, res: Response) {
    const role = normalizeRole(req.user?.role);
    if (!isAdminRole(role) && !isOperatorRole(role) && !isAssociateRole(role)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const page = toPage(req.query.page);
    const limit = toPositiveInt(req.query.limit, 300, 1000);
    const scopedCompanyIds = await buildScopedCompanyIds(req, role);

    const query: any = {
      isDeleted: { $ne: true },
      isQualityLabListed: true,
      labListingState: "LIVE",
      $or: [
        {
          "location.latitude": { $gte: -90, $lte: 90 },
          "location.longitude": { $gte: -180, $lte: 180 },
        },
        { pincodeEntry: { $type: "objectId" } },
      ],
    };

    if (Array.isArray(scopedCompanyIds)) {
      if (!scopedCompanyIds.length) {
        return res.status(200).json({
          success: true,
          data: { data: [], totalCount: 0, currentPage: page, totalPages: 0 },
        });
      }
      query._id = { $in: scopedCompanyIds };
    }

    const projection = {
      _id: 1,
      name: 1,
      phone: 1,
      phoneSecondary: 1,
      isQualityLabListed: 1,
      labDisplayName: 1,
      labContactPhone: 1,
      labContactPhoneSecondary: 1,
      address: 1,
      labTests: 1,
      labCertifications: 1,
      labSpecifications: 1,
      labAcceptedItems: 1,
      labNotes: 1,
      labListingState: 1,
      location: 1,
      pincodeEntry: 1,
    };

    const [rows, totalCount] = await Promise.all([
      AssociateCompanyModel.find(query, projection)
        .populate({ path: "pincodeEntry", select: "latitude longitude pincode officename" })
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AssociateCompanyModel.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        data: rows,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  }
}
