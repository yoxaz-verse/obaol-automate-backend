import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { DocumentTemplateModel } from "../database/models/documentTemplate";
import { DocumentTypeModel } from "../database/models/documentType";
import {
  TRADE_DOC_TYPES,
  buildDefaultLayoutSchema,
  ensureDefaultDocumentTemplate,
  resolveTemplateForRender,
  seedDefaultDocumentTemplates,
  validateLayoutSchema,
} from "../utils/documentTemplates";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";

const assertAdmin = (req: Request, res: Response) => {
  const role = normalizeRole(req.user?.role);
  if (!isAdmin(role)) {
    res.status(403).json({ success: false, message: "Admin only." });
    return false;
  }
  return true;
};

const normalizeDocumentType = (payload: any) => {
  const raw = String(payload?.documentType || payload?.docType || "").toUpperCase().trim();
  return raw;
};

const normalizeScope = (value: unknown) => {
  const raw = String(value || "GLOBAL").toUpperCase();
  return raw === "COMPANY_OVERRIDE" ? "COMPANY_OVERRIDE" : "GLOBAL";
};

const normalizeStage = (value: unknown) => {
  const raw = String(value || "DRAFT").toUpperCase();
  if (["DRAFT", "PREVIEW", "LIVE"].includes(raw)) return raw;
  return "DRAFT";
};

const normalizeActivationMode = (value: unknown) => {
  const raw = String(value || "IMMEDIATE").toUpperCase();
  return raw === "SCHEDULED" ? "SCHEDULED" : "IMMEDIATE";
};

export class DocumentTemplateController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const documentType = String(req.query?.documentType || req.query?.docType || "").toUpperCase().trim();
      const scope = normalizeScope(req.query?.scope);
      const stage = String(req.query?.stage || "").toUpperCase().trim();
      const companyId = String(req.query?.companyId || "").trim();

      if (documentType) {
        await ensureDefaultDocumentTemplate(documentType);
      }

      const query: any = { isDeleted: { $ne: true } };
      if (documentType) query.documentType = documentType;
      if (scope) query.scope = scope;
      if (stage && ["DRAFT", "PREVIEW", "LIVE"].includes(stage)) query.stage = stage;
      if (companyId && Types.ObjectId.isValid(companyId)) query.companyId = new Types.ObjectId(companyId);

      const rows = await DocumentTemplateModel.find(query)
        .sort({ documentType: 1, scope: 1, stage: 1, version: -1, updatedAt: -1 })
        .lean();

      const grouped = rows.reduce((acc: Record<string, any>, row: any) => {
        const typeKey = String(row.documentType || row.docType || "");
        const scopeKey = String(row.scope || "GLOBAL");
        const companyKey = String(row.companyId || "GLOBAL");
        const key = `${typeKey}::${scopeKey}::${companyKey}`;
        if (!acc[key]) {
          acc[key] = {
            documentType: typeKey,
            scope: scopeKey,
            companyId: row.companyId || null,
            draft: null,
            preview: null,
            live: null,
            all: [],
          };
        }
        if (String(row.stage) === "DRAFT" && row.isActive !== false && !acc[key].draft) acc[key].draft = row;
        if (String(row.stage) === "PREVIEW" && row.isActive !== false && !acc[key].preview) acc[key].preview = row;
        if (String(row.stage) === "LIVE" && row.isActive !== false && !acc[key].live) acc[key].live = row;
        acc[key].all.push(row);
        return acc;
      }, {});

      return res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id || "");
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid template id." });
      }
      const row = await DocumentTemplateModel.findById(id).lean();
      if (!row || row.isDeleted) {
        return res.status(404).json({ success: false, message: "Template not found." });
      }
      return res.json({ success: true, data: row });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!assertAdmin(req, res)) return;
      const documentType = normalizeDocumentType(req.body);
      if (!documentType) return res.status(400).json({ success: false, message: "documentType is required." });

      const docTypeExists = await DocumentTypeModel.findOne({ slug: documentType, isDeleted: { $ne: true }, isActive: true }).lean();
      if (!docTypeExists && !TRADE_DOC_TYPES.includes(documentType as any)) {
        return res.status(400).json({ success: false, message: "Unknown documentType. Create it in Document Types first." });
      }

      const scope = normalizeScope(req.body?.scope);
      const companyId = scope === "COMPANY_OVERRIDE" && Types.ObjectId.isValid(String(req.body?.companyId || ""))
        ? new Types.ObjectId(String(req.body.companyId))
        : null;

      const existingDraft = await DocumentTemplateModel.findOne({
        documentType,
        scope,
        companyId,
        stage: "DRAFT",
        isDeleted: { $ne: true },
        isActive: true,
      }).lean();

      if (existingDraft) {
        return res.status(409).json({ success: false, message: "Active draft already exists for this document type scope." });
      }

      const base = await ensureDefaultDocumentTemplate(documentType);
      const layoutSchema = req.body?.layoutSchema || base?.layoutSchema || buildDefaultLayoutSchema(documentType);
      const validationError = validateLayoutSchema(layoutSchema);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const created = await DocumentTemplateModel.create({
        documentType,
        docType: documentType,
        category: String(req.body?.category || "TRADE").toUpperCase(),
        status: "DRAFT",
        stage: "DRAFT",
        version: Number((base as any)?.version || 1),
        scope,
        companyId,
        activationMode: normalizeActivationMode(req.body?.activationMode),
        activationAt: req.body?.activationAt ? new Date(req.body.activationAt) : null,
        isActive: true,
        layoutSchema,
        letterheadConfig: req.body?.letterheadConfig || { enabled: false, presetId: null, firstPageOnly: true, watermark: "" },
        bindingConfig: req.body?.bindingConfig || { tokenMap: {}, manualFields: [] },
        createdBy: req.user?.id || null,
        updatedBy: req.user?.id || null,
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!assertAdmin(req, res)) return;
      const id = String(req.params.id || "");
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid template id." });
      }

      const existing = await DocumentTemplateModel.findById(id).lean();
      if (!existing || existing.isDeleted) {
        return res.status(404).json({ success: false, message: "Template not found." });
      }
      if (String(existing.stage || "DRAFT") !== "DRAFT") {
        return res.status(400).json({ success: false, message: "Only draft templates can be updated." });
      }

      const update: any = { updatedBy: req.user?.id || null };
      if (req.body?.layoutSchema) {
        const validationError = validateLayoutSchema(req.body.layoutSchema);
        if (validationError) {
          return res.status(400).json({ success: false, message: validationError });
        }
        update.layoutSchema = req.body.layoutSchema;
      }
      if (req.body?.letterheadConfig !== undefined) update.letterheadConfig = req.body.letterheadConfig;
      if (req.body?.bindingConfig !== undefined) update.bindingConfig = req.body.bindingConfig;
      if (req.body?.activationMode !== undefined) update.activationMode = normalizeActivationMode(req.body.activationMode);
      if (req.body?.activationAt !== undefined) update.activationAt = req.body.activationAt ? new Date(req.body.activationAt) : null;
      if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);

      const updated = await DocumentTemplateModel.findByIdAndUpdate(id, update, { new: true });
      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      if (!assertAdmin(req, res)) return;
      const id = String(req.params.id || "");
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid template id." });
      }

      const draft = await DocumentTemplateModel.findById(id).lean();
      if (!draft || draft.isDeleted) {
        return res.status(404).json({ success: false, message: "Template not found." });
      }
      if (String(draft.stage || "DRAFT") !== "DRAFT") {
        return res.status(400).json({ success: false, message: "Only draft templates can be published." });
      }

      const targetStage = normalizeStage(req.body?.stage || "LIVE");
      if (targetStage === "DRAFT") {
        return res.status(400).json({ success: false, message: "Publish target stage cannot be DRAFT." });
      }

      const activationMode = normalizeActivationMode(req.body?.activationMode || draft.activationMode || "IMMEDIATE");
      const activationAt = activationMode === "SCHEDULED"
        ? (req.body?.activationAt ? new Date(req.body.activationAt) : null)
        : null;
      if (activationMode === "SCHEDULED" && !activationAt) {
        return res.status(400).json({ success: false, message: "activationAt is required for scheduled activation." });
      }

      if (targetStage === "LIVE") {
        await DocumentTemplateModel.updateMany(
          {
            documentType: draft.documentType,
            scope: draft.scope,
            companyId: draft.companyId || null,
            stage: "LIVE",
            isDeleted: { $ne: true },
          },
          { $set: { isActive: false } }
        );
      }

      const latestPublished = await DocumentTemplateModel.findOne({
        documentType: draft.documentType,
        scope: draft.scope,
        companyId: draft.companyId || null,
        stage: targetStage,
        isDeleted: { $ne: true },
      })
        .sort({ version: -1 })
        .lean();

      const nextVersion = Number(latestPublished?.version || 0) + 1;

      const created = await DocumentTemplateModel.create({
        documentType: draft.documentType,
        docType: draft.docType || draft.documentType,
        category: draft.category || "TRADE",
        status: "PUBLISHED",
        stage: targetStage,
        version: nextVersion,
        scope: draft.scope || "GLOBAL",
        companyId: draft.companyId || null,
        activationMode,
        activationAt,
        isActive: activationMode === "IMMEDIATE",
        layoutSchema: draft.layoutSchema,
        letterheadConfig: draft.letterheadConfig || {},
        bindingConfig: draft.bindingConfig || {},
        createdBy: req.user?.id || draft.createdBy || null,
        updatedBy: req.user?.id || null,
      });

      await DocumentTemplateModel.findByIdAndUpdate(draft._id, {
        $set: { isDeleted: true, isActive: false, updatedBy: req.user?.id || null },
      });

      return res.json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const documentType = normalizeDocumentType(req.body);
      if (!documentType) return res.status(400).json({ success: false, message: "documentType is required." });

      const template = await resolveTemplateForRender(documentType, String(req.body?.companyId || ""));
      if (!template) return res.status(404).json({ success: false, message: "No template available." });

      const manualInput = req.body?.manualInput || {};
      const tokenData = req.body?.tokenData || {};
      const manualFields = Array.isArray(template?.bindingConfig?.manualFields) ? template.bindingConfig.manualFields : [];
      const missingManualFields = manualFields
        .filter((f: any) => Boolean(f?.required))
        .filter((f: any) => !String(manualInput?.[String(f?.key || "")] || f?.defaultValue || "").trim())
        .map((f: any) => ({ key: f.key, label: f.label || f.key }));

      return res.json({
        success: true,
        data: {
          template,
          diagnostics: {
            missingManualFields,
            valid: missingManualFields.length === 0,
          },
          resolvedPayload: {
            tokenData,
            manualInput,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const documentType = normalizeDocumentType(req.body);
      if (!documentType) return res.status(400).json({ success: false, message: "documentType is required." });

      const template = await resolveTemplateForRender(documentType, String(req.body?.companyId || ""));
      if (!template) return res.status(404).json({ success: false, message: "No template available." });

      const manualInput = req.body?.manualInput || {};
      const tokenData = req.body?.tokenData || {};
      const manualFields = Array.isArray(template?.bindingConfig?.manualFields) ? template.bindingConfig.manualFields : [];
      const missingManualFields = manualFields
        .filter((f: any) => Boolean(f?.required))
        .filter((f: any) => !String(manualInput?.[String(f?.key || "")] || f?.defaultValue || "").trim())
        .map((f: any) => ({ key: f.key, label: f.label || f.key }));

      if (missingManualFields.length > 0) {
        return res.status(400).json({ success: false, message: "Required manual fields missing.", diagnostics: { missingManualFields } });
      }

      return res.json({
        success: true,
        data: {
          generated: true,
          documentType,
          templateId: template._id,
          stage: template.stage,
          layoutSchema: template.layoutSchema,
          letterheadConfig: template.letterheadConfig || {},
          resolvedPayload: {
            tokenData,
            manualInput,
          },
          message: "Document payload generated. PDF rendering pipeline can consume this payload.",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async seed(req: Request, res: Response, next: NextFunction) {
    try {
      if (!assertAdmin(req, res)) return;
      const force = String(req.query?.force || "").toLowerCase() === "true";
      await seedDefaultDocumentTemplates(force);
      const rows = await DocumentTemplateModel.find({ isDeleted: { $ne: true } })
        .sort({ documentType: 1, scope: 1, stage: 1, version: -1 })
        .lean();
      return res.json({ success: true, data: rows, seeded: true, forced: force });
    } catch (error) {
      next(error);
    }
  }
}
