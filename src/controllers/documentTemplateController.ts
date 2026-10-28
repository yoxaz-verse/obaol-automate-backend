import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { DocumentTemplateModel } from "../database/models/documentTemplate";
import { DocumentTypeModel } from "../database/models/documentType";
import { AssociateModel } from "../database/models/associate";
import {
  TRADE_DOC_TYPES,
  buildDefaultLayoutSchema,
  ensureDefaultDocumentTemplate,
  resolveTemplateForRender,
  seedDefaultDocumentTemplates,
  validateLayoutSchema,
} from "../utils/documentTemplates";
import { renderDocumentHtml } from "../services/documentRenderService";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";
const SUPPORTED_TEMPLATE_TOKENS = new Set([
  "document.number", "document.type", "document.issueDate", "document.dueDate", "document.status",
  "issuer.name", "issuer.address", "issuer.email", "issuer.phone", "issuer.gstin",
  "buyer.name", "buyer.address", "buyer.email", "seller.name", "seller.address", "seller.email",
  "totals.currency", "totals.subtotal", "totals.tax", "totals.discount", "totals.grandTotal",
  "terms.payment", "terms.delivery", "terms.conditions", "terms.notes",
  "context.enquiry", "context.order", "context.shipment", "context.reference", "context.authorizedSignatory",
]);

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
        name: String(req.body?.name || `${documentType.replace(/_/g, " ")} Template`).trim(),
        description: String(req.body?.description || "").trim(),
        visualStyle: ["CLASSIC", "MODERN", "COMPACT", "CUSTOM"].includes(String(req.body?.visualStyle || "").toUpperCase()) ? String(req.body.visualStyle).toUpperCase() : "CUSTOM",
        displayOrder: Number(req.body?.displayOrder || 0),
        thumbnailUrl: String(req.body?.thumbnailUrl || ""),
        isDefault: false,
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
      if (req.body?.name !== undefined) update.name = String(req.body.name || "").trim();
      if (req.body?.description !== undefined) update.description = String(req.body.description || "").trim();
      if (req.body?.displayOrder !== undefined) update.displayOrder = Number(req.body.displayOrder || 0);
      if (req.body?.thumbnailUrl !== undefined) update.thumbnailUrl = String(req.body.thumbnailUrl || "");
      if (req.body?.visualStyle !== undefined && ["CLASSIC", "MODERN", "COMPACT", "CUSTOM"].includes(String(req.body.visualStyle).toUpperCase())) update.visualStyle = String(req.body.visualStyle).toUpperCase();
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
      const unsupportedTokens = (draft.layoutSchema?.elements || [])
        .filter((element: any) => element?.binding?.bindingType === "SYSTEM_TOKEN")
        .map((element: any) => String(element?.binding?.token || "").trim())
        .filter((token: string) => token && !SUPPORTED_TEMPLATE_TOKENS.has(token));
      if (unsupportedTokens.length) return res.status(400).json({ success: false, message: "Template contains unsupported variables.", diagnostics: { unsupportedVariables: Array.from(new Set(unsupportedTokens)) } });

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
        name: draft.name || `${draft.documentType.replace(/_/g, " ")} Template`,
        description: draft.description || "",
        visualStyle: draft.visualStyle || "CUSTOM",
        displayOrder: Number(draft.displayOrder || 0),
        thumbnailUrl: draft.thumbnailUrl || "",
        isDefault: Boolean(req.body?.isDefault),
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

      if (created.isDefault) {
        await DocumentTemplateModel.updateMany({ _id: { $ne: created._id }, documentType: created.documentType, scope: created.scope, companyId: created.companyId || null, stage: "LIVE", isDeleted: { $ne: true } }, { $set: { isDefault: false } });
      }

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

      const requestedTemplateId = String(req.body?.templateId || "");
      const template = Types.ObjectId.isValid(requestedTemplateId)
        ? await DocumentTemplateModel.findOne({ _id: requestedTemplateId, documentType, isDeleted: { $ne: true } }).lean()
        : await resolveTemplateForRender(documentType, String(req.body?.companyId || ""));
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
          html: renderDocumentHtml(req.body?.document || { type: documentType, documentNumber: "PREVIEW", status: "DRAFT", documentData: {}, totals: { currency: "INR" }, terms: {} }, template),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async available(req: Request, res: Response, next: NextFunction) {
    try {
      const documentType = String(req.query?.documentType || "").toUpperCase().trim();
      if (!documentType) return res.status(400).json({ success: false, message: "documentType is required." });
      await ensureDefaultDocumentTemplate(documentType);
      let companyId = "";
      if (normalizeRole(req.user?.role) === "associate") {
        const associate: any = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
        companyId = String(associate?.associateCompany || "");
      } else if (Types.ObjectId.isValid(String(req.query?.companyId || ""))) companyId = String(req.query.companyId);
      const scopes: any[] = [{ scope: "GLOBAL", companyId: null }];
      if (companyId) scopes.push({ scope: "COMPANY_OVERRIDE", companyId: new Types.ObjectId(companyId) });
      const rows = await DocumentTemplateModel.find({ documentType, stage: "LIVE", status: "PUBLISHED", isActive: true, isDeleted: { $ne: true }, $or: scopes }).sort({ scope: -1, isDefault: -1, displayOrder: 1, name: 1 }).select("name description visualStyle displayOrder thumbnailUrl isDefault documentType scope companyId version layoutSchema letterheadConfig bindingConfig").lean();
      return res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!assertAdmin(req, res)) return;
      const source: any = await DocumentTemplateModel.findById(req.params.id).lean();
      if (!source || source.isDeleted) return res.status(404).json({ success: false, message: "Template not found." });
      const existingDraft = await DocumentTemplateModel.findOne({ documentType: source.documentType, scope: source.scope, companyId: source.companyId || null, stage: "DRAFT", isDeleted: { $ne: true }, isActive: true });
      if (existingDraft) return res.status(409).json({ success: false, message: "Finish the existing draft before duplicating another template." });
      const created = await DocumentTemplateModel.create({ ...source, _id: undefined, createdAt: undefined, updatedAt: undefined, name: String(req.body?.name || `${source.name || "Template"} Copy`), stage: "DRAFT", status: "DRAFT", isDefault: false, version: source.version, createdBy: req.user?.id || null, updatedBy: req.user?.id || null });
      return res.status(201).json({ success: true, data: created });
    } catch (error) { next(error); }
  }

  async setDefault(req: Request, res: Response, next: NextFunction) {
    try {
      if (!assertAdmin(req, res)) return;
      const row: any = await DocumentTemplateModel.findOne({ _id: req.params.id, stage: "LIVE", status: "PUBLISHED", isDeleted: { $ne: true }, isActive: true });
      if (!row) return res.status(404).json({ success: false, message: "Published template not found." });
      await DocumentTemplateModel.updateMany({ documentType: row.documentType, scope: row.scope, companyId: row.companyId || null, stage: "LIVE", isDeleted: { $ne: true } }, { $set: { isDefault: false } });
      row.isDefault = true; await row.save();
      return res.json({ success: true, data: row });
    } catch (error) { next(error); }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!assertAdmin(req, res)) return;
      const row: any = await DocumentTemplateModel.findOne({ _id: req.params.id, stage: "LIVE", isDeleted: { $ne: true } });
      if (!row) return res.status(404).json({ success: false, message: "Published template not found." });
      if (row.isDefault) return res.status(409).json({ success: false, message: "Choose another default before deactivating this template." });
      row.isActive = false; await row.save(); return res.json({ success: true, data: row });
    } catch (error) { next(error); }
  }

  async variables(req: Request, res: Response) {
    const groups = [
      { group: "Document", variables: ["document.number", "document.type", "document.issueDate", "document.dueDate", "document.status"] },
      { group: "Parties", variables: ["issuer.name", "issuer.address", "issuer.email", "issuer.phone", "issuer.gstin", "buyer.name", "buyer.address", "buyer.email", "seller.name", "seller.address", "seller.email"] },
      { group: "Totals", variables: ["totals.currency", "totals.subtotal", "totals.tax", "totals.discount", "totals.grandTotal"] },
      { group: "Terms", variables: ["terms.payment", "terms.delivery", "terms.conditions", "terms.notes"] },
      { group: "Context", variables: ["context.enquiry", "context.order", "context.shipment", "context.reference", "context.authorizedSignatory"] },
    ];
    return res.json({ success: true, data: groups, documentType: String(req.query?.documentType || "").toUpperCase() });
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
