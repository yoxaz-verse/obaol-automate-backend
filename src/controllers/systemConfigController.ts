import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { SystemConfigModel } from "../database/models/systemConfig";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import {
  getCalculationConfig,
  setCalculationConfig,
  CalculationConfig,
} from "../utils/calculationConfig";
import {
  AuthEmailTemplateType,
  getAuthTemplateTypes,
  listAuthEmailTemplates,
  publishAuthEmailTemplate,
  saveAuthEmailTemplateDraft,
} from "../utils/authEmailTemplates";
import { sendAuthTemplateTestEmail } from "../utils/mailer";

const OBAOL_COMPANY_KEY = "OBAOL_COMPANY_ID";

const isAdmin = (role: unknown) => String(role || "").toLowerCase() === "admin";
const isFiniteNonNegative = (value: any) => Number.isFinite(Number(value)) && Number(value) >= 0;

class SystemConfigController {
  private normalizeTemplateType(input: unknown): AuthEmailTemplateType | null {
    const value = String(input || "").trim() as AuthEmailTemplateType;
    return getAuthTemplateTypes().includes(value) ? value : null;
  }

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

  async getCalculations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }

      const config = await getCalculationConfig();
      return res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  async setCalculations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }

      const payload = req.body || {};
      const nextConfig: Partial<CalculationConfig> = {};

      if (payload.variantRateCommissionPercent !== undefined) {
        if (!isFiniteNonNegative(payload.variantRateCommissionPercent)) {
          return res.status(400).json({ success: false, message: "variantRateCommissionPercent must be a non-negative number." });
        }
        nextConfig.variantRateCommissionPercent = Number(payload.variantRateCommissionPercent);
      }
      if (payload.gstPercent !== undefined) {
        if (!isFiniteNonNegative(payload.gstPercent)) {
          return res.status(400).json({ success: false, message: "gstPercent must be a non-negative number." });
        }
        nextConfig.gstPercent = Number(payload.gstPercent);
      }
      if (payload.importAdminCommissionDefault !== undefined) {
        if (!isFiniteNonNegative(payload.importAdminCommissionDefault)) {
          return res.status(400).json({ success: false, message: "importAdminCommissionDefault must be a non-negative number." });
        }
        nextConfig.importAdminCommissionDefault = Number(payload.importAdminCommissionDefault);
      }
      if (payload.warehouseStorageRateDefault !== undefined) {
        if (!isFiniteNonNegative(payload.warehouseStorageRateDefault)) {
          return res.status(400).json({ success: false, message: "warehouseStorageRateDefault must be a non-negative number." });
        }
        nextConfig.warehouseStorageRateDefault = Number(payload.warehouseStorageRateDefault);
      }

      const updated = await setCalculationConfig(nextConfig, String(req.user?.id || ""));
      return res.json({ success: true, data: updated, message: "Calculation configuration updated." });
    } catch (error) {
      next(error);
    }
  }

  async listEmailTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }
      const templates = await listAuthEmailTemplates();
      return res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }

  async saveEmailTemplateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }
      const templateType = this.normalizeTemplateType(req.body?.templateType);
      const subject = String(req.body?.subject || "").trim();
      const html = String(req.body?.html || "").trim();
      const text = String(req.body?.text || "").trim();
      if (!templateType) {
        return res.status(400).json({ success: false, message: "Valid templateType is required." });
      }
      if (!subject || !html || !text) {
        return res.status(400).json({ success: false, message: "subject, html and text are required." });
      }
      const draft = await saveAuthEmailTemplateDraft(templateType, {
        subject,
        html,
        text,
        updatedBy: String(req.user?.id || ""),
      });
      return res.json({ success: true, data: draft, message: "Draft saved." });
    } catch (error) {
      next(error);
    }
  }

  async publishEmailTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }
      const templateType = this.normalizeTemplateType(req.body?.templateType);
      if (!templateType) {
        return res.status(400).json({ success: false, message: "Valid templateType is required." });
      }
      const published = await publishAuthEmailTemplate(templateType, String(req.user?.id || ""));
      return res.json({ success: true, data: published, message: "Template published." });
    } catch (error) {
      next(error);
    }
  }

  async testEmailTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Admin access required." });
      }
      const templateType = this.normalizeTemplateType(req.body?.templateType);
      const toEmail = String(req.body?.toEmail || "").trim();
      const subject = String(req.body?.subject || "").trim();
      const html = String(req.body?.html || "").trim();
      const text = String(req.body?.text || "").trim();
      if (!templateType || !toEmail || !subject || !html || !text) {
        return res.status(400).json({ success: false, message: "templateType, toEmail, subject, html and text are required." });
      }
      await sendAuthTemplateTestEmail(toEmail, templateType, { subject, html, text });
      return res.json({ success: true, message: "Test email sent." });
    } catch (error) {
      next(error);
    }
  }
}

export const systemConfigController = new SystemConfigController();
