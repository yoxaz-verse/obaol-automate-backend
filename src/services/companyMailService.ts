import crypto from "crypto";
import { CompanyMailConnectionModel } from "../database/models/companyMailConnection";

type Provider = "GOOGLE" | "MICROSOFT";
type Credentials = { accessToken: string; refreshToken?: string; expiresAt?: number };

const encryptionKey = () => {
  const raw = String(process.env.MAIL_CREDENTIAL_ENCRYPTION_KEY || "");
  if (!raw) throw new Error("MAIL_CREDENTIAL_ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(raw).digest();
};
export const encryptMailCredentials = (value: Credentials) => {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
};
const decryptMailCredentials = (value: string): Credentials => {
  const [iv, tag, encrypted] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"));
};
const providerConfig = (provider: Provider) => provider === "GOOGLE" ? {
  clientId: process.env.GOOGLE_MAIL_CLIENT_ID, clientSecret: process.env.GOOGLE_MAIL_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_MAIL_REDIRECT_URI, tokenUrl: "https://oauth2.googleapis.com/token",
} : { clientId: process.env.MICROSOFT_MAIL_CLIENT_ID, clientSecret: process.env.MICROSOFT_MAIL_CLIENT_SECRET,
  redirectUri: process.env.MICROSOFT_MAIL_REDIRECT_URI, tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token" };
const tokenRequest = async (provider: Provider, body: URLSearchParams) => {
  const config = providerConfig(provider);
  if (!config.clientId || !config.clientSecret || !config.redirectUri) throw new Error(`${provider} mail OAuth is not configured`);
  body.set("client_id", config.clientId); body.set("client_secret", config.clientSecret); body.set("redirect_uri", config.redirectUri);
  const response = await fetch(config.tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const json: any = await response.json(); if (!response.ok) throw new Error(json.error_description || json.error || "OAuth token request failed");
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000 } as Credentials;
};
export const exchangeMailCode = (provider: Provider, code: string) => tokenRequest(provider, new URLSearchParams({ grant_type: "authorization_code", code }));
const refresh = (provider: Provider, refreshToken: string) => tokenRequest(provider, new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, ...(provider === "MICROSOFT" ? { scope: "offline_access User.Read Mail.Send" } : {}) }));
export const mailProfile = async (provider: Provider, accessToken: string) => {
  const url = provider === "GOOGLE" ? "https://openidconnect.googleapis.com/v1/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } }); const json: any = await response.json();
  if (!response.ok) throw new Error(json?.error?.message || "Could not read mailbox profile");
  return String(provider === "GOOGLE" ? json.email : json.mail || json.userPrincipalName).toLowerCase();
};
export const usableConnection = async (companyId: unknown) => {
  const connection: any = await CompanyMailConnectionModel.findOne({ companyId, status: "CONNECTED" }).select("+encryptedCredentials");
  if (!connection) throw Object.assign(new Error("Connect a company Gmail or Outlook mailbox in Settings first."), { statusCode: 409 });
  let credentials = decryptMailCredentials(connection.encryptedCredentials);
  if (!credentials.accessToken || Number(credentials.expiresAt || 0) < Date.now() + 60000) {
    if (!credentials.refreshToken) { connection.status = "RECONNECT_REQUIRED"; await connection.save(); throw Object.assign(new Error("The company mailbox must be reconnected."), { statusCode: 409 }); }
    try { const next = await refresh(connection.provider, credentials.refreshToken); credentials = { ...next, refreshToken: next.refreshToken || credentials.refreshToken }; connection.encryptedCredentials = encryptMailCredentials(credentials); connection.tokenExpiresAt = new Date(credentials.expiresAt!); await connection.save(); }
    catch (error) { connection.status = "RECONNECT_REQUIRED"; connection.lastErrorAt = new Date(); connection.lastErrorCode = "TOKEN_REFRESH_FAILED"; await connection.save(); throw error; }
  }
  return { connection, credentials };
};
const base64url = (value: Buffer | string) => Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const sendCompanyDocumentEmail = async (input: { connection: any; credentials: Credentials; to: string; cc: string[]; subject: string; text: string; html: string; filename: string; pdf: Buffer }) => {
  const { connection, credentials } = input;
  if (connection.provider === "GOOGLE") {
    const boundary = `obaol_${crypto.randomBytes(12).toString("hex")}`;
    const mime = [`From: ${connection.email}`, `To: ${input.to}`, ...(input.cc.length ? [`Cc: ${input.cc.join(", ")}`] : []), `Subject: ${input.subject}`, "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary=${boundary}`, "", `--${boundary}`, "Content-Type: text/html; charset=UTF-8", "", input.html, `--${boundary}`, `Content-Type: application/pdf; name=\"${input.filename}\"`, "Content-Transfer-Encoding: base64", `Content-Disposition: attachment; filename=\"${input.filename}\"`, "", input.pdf.toString("base64"), `--${boundary}--`].join("\r\n");
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { authorization: `Bearer ${credentials.accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ raw: base64url(mime) }) });
    const json: any = await response.json(); if (!response.ok) throw new Error(json?.error?.message || "Gmail rejected the message"); return String(json.id || "");
  }
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", { method: "POST", headers: { authorization: `Bearer ${credentials.accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ message: { subject: input.subject, body: { contentType: "HTML", content: input.html }, toRecipients: [{ emailAddress: { address: input.to } }], ccRecipients: input.cc.map(address => ({ emailAddress: { address } })), attachments: [{ "@odata.type": "#microsoft.graph.fileAttachment", name: input.filename, contentType: "application/pdf", contentBytes: input.pdf.toString("base64") }] }, saveToSentItems: true }) });
  if (!response.ok) { const json: any = await response.json().catch(() => ({})); throw new Error(json?.error?.message || "Outlook rejected the message"); }
  return String(response.headers.get("request-id") || "");
};
