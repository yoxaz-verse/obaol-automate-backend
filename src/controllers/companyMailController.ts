import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyMailConnectionModel } from "../database/models/companyMailConnection";
import { encryptMailCredentials, exchangeMailCode, mailProfile } from "../services/companyMailService";
import { resolvePublicFrontendUrl } from "../utils/publicFrontendUrl";

type Provider = "GOOGLE" | "MICROSOFT";
const stateSecret = () => String(process.env.MAIL_OAUTH_STATE_SECRET || process.env.JWT_SECRET || "");
const signState = (payload: object) => { const body = Buffer.from(JSON.stringify(payload)).toString("base64url"); return `${body}.${crypto.createHmac("sha256", stateSecret()).update(body).digest("base64url")}`; };
const readState = (value: string) => { const [body, signature] = value.split("."); const expected = crypto.createHmac("sha256", stateSecret()).update(body).digest("base64url"); if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid OAuth state"); const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); if (Number(data.exp || 0) < Date.now()) throw new Error("OAuth state expired"); return data; };
const companyForUser = async (req: Request) => {
  const associate: any = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
  if (!associate?.associateCompany) throw Object.assign(new Error("A verified company account is required."), { statusCode: 403 });
  const company = await AssociateCompanyModel.findOne({ _id: associate.associateCompany, registrationStatus: "APPROVED", isDeleted: { $ne: true } }).select("_id").lean();
  if (!company) throw Object.assign(new Error("Company verification is required."), { statusCode: 403 }); return company;
};
const publicConnection = (row: any) => row ? ({ provider: row.provider, email: row.email, status: row.status, connectedAt: row.createdAt, updatedAt: row.updatedAt, lastSuccessfulUseAt: row.lastSuccessfulUseAt, lastErrorAt: row.lastErrorAt, reconnectRequired: row.status === "RECONNECT_REQUIRED" }) : null;

export class CompanyMailController {
  async status(req: Request, res: Response, next: NextFunction) { try { const company = await companyForUser(req); const row: any = await CompanyMailConnectionModel.findOne({ companyId: company._id, status: { $ne: "DISCONNECTED" } }).lean(); return res.json({ success: true, data: publicConnection(row) }); } catch (e) { next(e); } }
  async authorize(req: Request, res: Response, next: NextFunction) { try {
    const company = await companyForUser(req), provider = String(req.params.provider || "").toUpperCase() as Provider;
    if (!["GOOGLE", "MICROSOFT"].includes(provider)) return res.status(400).json({ success: false, message: "Unsupported mail provider." });
    const state = signState({ companyId: String(company._id), userId: String(req.user?.id), provider, exp: Date.now() + 10 * 60 * 1000 });
    const clientId = provider === "GOOGLE" ? process.env.GOOGLE_MAIL_CLIENT_ID : process.env.MICROSOFT_MAIL_CLIENT_ID;
    const redirectUri = provider === "GOOGLE" ? process.env.GOOGLE_MAIL_REDIRECT_URI : process.env.MICROSOFT_MAIL_REDIRECT_URI;
    if (!clientId || !redirectUri || !stateSecret()) return res.status(503).json({ success: false, message: `${provider === "GOOGLE" ? "Gmail" : "Outlook"} connection is not configured by OBAOL.` });
    const url = provider === "GOOGLE"
      ? `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email https://www.googleapis.com/auth/gmail.send", access_type: "offline", prompt: "consent", state })}`
      : `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", response_mode: "query", scope: "offline_access User.Read Mail.Send", state })}`;
    return res.json({ success: true, data: { authorizationUrl: url } });
  } catch (e) { next(e); } }
  async callback(req: Request, res: Response) {
    const frontend = resolvePublicFrontendUrl();
    try { const state = readState(String(req.query.state || "")), provider = state.provider as Provider; if (String(req.user?.id || "") !== String(state.userId)) throw new Error("Sign in with the account that started this connection.");
      const company = await companyForUser(req); if (String(company._id) !== String(state.companyId)) throw new Error("The mailbox connection belongs to another company.");
      const credentials = await exchangeMailCode(provider, String(req.query.code || "")); const email = await mailProfile(provider, credentials.accessToken);
      const scopes = provider === "GOOGLE" ? ["gmail.send", "openid", "email"] : ["Mail.Send", "User.Read"];
      await CompanyMailConnectionModel.findOneAndUpdate({ companyId: company._id }, { provider, email, encryptedCredentials: encryptMailCredentials(credentials), scopes, status: "CONNECTED", tokenExpiresAt: new Date(credentials.expiresAt!), lastErrorAt: null, lastErrorCode: "", disconnectedAt: null, connectedBy: req.user?.id }, { upsert: true, new: true, runValidators: true });
      return res.redirect(`${frontend}/dashboard/settings/mail?connected=1`);
    } catch (error: any) { return res.redirect(`${frontend}/dashboard/settings/mail?error=${encodeURIComponent(error.message || "Mailbox connection failed")}`); }
  }
  async disconnect(req: Request, res: Response, next: NextFunction) { try { const company = await companyForUser(req); await CompanyMailConnectionModel.updateOne({ companyId: company._id }, { $set: { status: "DISCONNECTED", disconnectedAt: new Date() }, $unset: { encryptedCredentials: 1 } }); return res.json({ success: true, data: null }); } catch (e) { next(e); } }
}
