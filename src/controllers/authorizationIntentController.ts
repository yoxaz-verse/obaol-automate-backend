import { NextFunction, Request, Response } from "express";
import { authorizationPasskeyOptions, createAuthorizationIntent, requestAuthorizationOtp, verifyAuthorizationOtp, verifyAuthorizationPasskey } from "../services/authorizationIntentService";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { sensitiveDocumentPayload } from "../utils/sensitiveDocumentAuthorization";
import { ensureDefaultDocumentTemplate, resolveTemplateForRender } from "../utils/documentTemplates";
import { normalizePhoneInput } from "../utils/phone";

const allowedActions = new Set(["SIGNATURE_ACTIVATE", "SIGNATURE_REVOKE", "DOCUMENT_ISSUE", "DOCUMENT_EMAIL", "DOCUMENT_WHATSAPP", "DOCUMENT_INVITE"]);

export class AuthorizationIntentController {
  async create(req: Request, res: Response, next: NextFunction) { try {
    const action = String(req.body?.action || "").toUpperCase();
    if (!allowedActions.has(action)) return res.status(400).json({ success: false, message: "Unsupported sensitive action." });
    let payload = req.body?.payload || {};
    if (action.startsWith("DOCUMENT_")) {
      const doc: any = await TradeDocumentModel.findOne({ _id: payload.documentId, isDeleted: { $ne: true } });
      if (!doc) return res.status(404).json({ success: false, message: "Document not found." });
      if (action === "DOCUMENT_ISSUE" && !doc.selectedTemplateId) {
        await ensureDefaultDocumentTemplate(String(doc.type || ""));
        const template: any = await resolveTemplateForRender(String(doc.type || ""), String(doc.ownerCompanyId || "") || undefined);
        if (template?._id) { doc.selectedTemplateId = template._id; doc.selectedTemplateVersion = template.version; }
      }
      if (action === "DOCUMENT_WHATSAPP" && payload.recipient) payload = { ...payload, recipient: normalizePhoneInput({ rawPhone: String(payload.recipient) }).e164 };
      payload = sensitiveDocumentPayload(action, doc, payload);
    }
    const row: any = await createAuthorizationIntent(req, action, payload, req.body?.companyId, String(req.body?.idempotencyKey || "") || undefined);
    return res.status(201).json({ success: true, data: { id: row._id, action: row.action, expiresAt: row.expiresAt } });
  } catch (e) { next(e); } }
  async otp(req: Request, res: Response, next: NextFunction) { try { return res.json({ success: true, data: await requestAuthorizationOtp(req, req.params.id) }); } catch (e) { next(e); } }
  async verifyOtp(req: Request, res: Response, next: NextFunction) { try { const row: any = await verifyAuthorizationOtp(req, req.params.id, String(req.body?.code || "")); return res.json({ success: true, data: { id: row._id, verified: true, method: row.authenticationMethod, expiresAt: row.expiresAt } }); } catch (e) { next(e); } }
  async passkeyOptions(req: Request, res: Response, next: NextFunction) { try { return res.json({ success: true, options: await authorizationPasskeyOptions(req, req.params.id) }); } catch (e) { next(e); } }
  async verifyPasskey(req: Request, res: Response, next: NextFunction) { try { const row: any = await verifyAuthorizationPasskey(req, req.params.id, req.body?.response); return res.json({ success: true, data: { id: row._id, verified: true, method: row.authenticationMethod, expiresAt: row.expiresAt } }); } catch (e) { next(e); } }
}
