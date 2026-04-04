import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { SystemConfigModel } from "../database/models/systemConfig";
import { AssociateCompanyModel } from "../database/models/associateCompany";

const OBAOL_COMPANY_KEY = "OBAOL_COMPANY_ID";

const isAdmin = (role: unknown) => String(role || "").toLowerCase() === "admin";

class SystemConfigController {
  async getObaolCompany(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }

      const row = await SystemConfigModel.findOne({ key: OBAOL_COMPANY_KEY }).lean();
      const companyIdRaw = String(row?.value || "").trim();
      const company = companyIdRaw && Types.ObjectId.isValid(companyIdRaw)
        ? await AssociateCompanyModel.findById(companyIdRaw).select("name email phone address gstin slug").lean()
        : null;

      return res.json({
        success: true,
        data: {
          companyId: companyIdRaw || null,
          company,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async setObaolCompany(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }

      const companyIdRaw = String(req.body?.companyId || "").trim();
      if (!companyIdRaw || !Types.ObjectId.isValid(companyIdRaw)) {
        return res.status(400).json({ success: false, message: "Valid companyId is required." });
      }

      const company = await AssociateCompanyModel.findById(companyIdRaw).select("name email phone address gstin slug").lean();
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found." });
      }

      await SystemConfigModel.findOneAndUpdate(
        { key: OBAOL_COMPANY_KEY },
        { value: companyIdRaw, updatedBy: req.user?.id || null },
        { upsert: true, new: true }
      );

      return res.json({
        success: true,
        data: {
          companyId: companyIdRaw,
          company,
        },
        message: "OBAOL company configuration updated.",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const systemConfigController = new SystemConfigController();

