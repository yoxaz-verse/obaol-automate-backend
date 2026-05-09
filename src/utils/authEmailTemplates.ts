import { SystemConfigModel } from "../database/models/systemConfig";

export type AuthEmailTemplateType =
  | "signup_otp"
  | "signin_otp"
  | "forgot_password_otp"
  | "verification_otp";

export type AuthEmailTemplateStatus = "draft" | "published";

export type AuthEmailTemplateRecord = {
  templateType: AuthEmailTemplateType;
  subject: string;
  html: string;
  text: string;
  status: AuthEmailTemplateStatus;
  version: number;
  updatedBy?: string | null;
  updatedAt: string;
};

export type AuthEmailTemplateContext = {
  code: string;
  roleLabel: string;
  expiresIn: string;
  supportEmail: string;
  appName: string;
};

const TEMPLATE_TYPES: AuthEmailTemplateType[] = [
  "signup_otp",
  "signin_otp",
  "forgot_password_otp",
  "verification_otp",
];

const nowIso = () => new Date().toISOString();

const defaultTemplate = (templateType: AuthEmailTemplateType): Omit<AuthEmailTemplateRecord, "status" | "version" | "updatedBy" | "updatedAt"> => {
  if (templateType === "signup_otp") {
    return {
      templateType,
      subject: "Complete your OBAOL signup - OTP {{code}}",
      text:
        "You requested an OTP for {{roleLabel}} signup.\n\nCode: {{code}}\nExpires in {{expiresIn}}.\n\nIf this wasn't you, ignore this email.\n\nSupport: {{supportEmail}}",
      html:
        "<div style=\"font-family:Arial,sans-serif\"><h2>Welcome to {{appName}}</h2><p>You requested an OTP for <b>{{roleLabel}}</b> signup.</p><p style=\"font-size:24px;letter-spacing:4px\"><b>{{code}}</b></p><p>Expires in {{expiresIn}}.</p><p>If this wasn't you, ignore this email.</p><hr/><p>Support: {{supportEmail}}</p></div>",
    };
  }
  if (templateType === "signin_otp") {
    return {
      templateType,
      subject: "Secure sign-in code for {{appName}}",
      text:
        "Use this sign-in verification code: {{code}}\nExpires in {{expiresIn}}.\n\nIf this wasn't you, reset your password.\nSupport: {{supportEmail}}",
      html:
        "<div style=\"font-family:Arial,sans-serif\"><h2>{{appName}} Sign-in Verification</h2><p>Use this code to continue sign-in:</p><p style=\"font-size:24px;letter-spacing:4px\"><b>{{code}}</b></p><p>Expires in {{expiresIn}}.</p><p>If this wasn't you, reset your password immediately.</p><hr/><p>Support: {{supportEmail}}</p></div>",
    };
  }
  if (templateType === "forgot_password_otp") {
    return {
      templateType,
      subject: "Password reset OTP for {{appName}}",
      text:
        "We received a password reset request.\nReset code: {{code}}\nExpires in {{expiresIn}}.\n\nIf you didn't request this, ignore this email.\nSupport: {{supportEmail}}",
      html:
        "<div style=\"font-family:Arial,sans-serif\"><h2>{{appName}} Password Reset</h2><p>We received a password reset request for your account.</p><p style=\"font-size:24px;letter-spacing:4px\"><b>{{code}}</b></p><p>Expires in {{expiresIn}}.</p><p>If you didn't request this, you can safely ignore this email.</p><hr/><p>Support: {{supportEmail}}</p></div>",
    };
  }
  return {
    templateType,
    subject: "{{appName}} verification code",
    text:
      "Your verification code is {{code}}.\nExpires in {{expiresIn}}.\nDo not share this code.\nSupport: {{supportEmail}}",
    html:
      "<div style=\"font-family:Arial,sans-serif\"><h2>{{appName}} Verification</h2><p>Your verification code:</p><p style=\"font-size:24px;letter-spacing:4px\"><b>{{code}}</b></p><p>Expires in {{expiresIn}}.</p><hr/><p>Support: {{supportEmail}}</p></div>",
  };
};

const publishedKey = (templateType: AuthEmailTemplateType) => `AUTH_EMAIL_TEMPLATE_PUBLISHED::${templateType}`;
const draftKey = (templateType: AuthEmailTemplateType) => `AUTH_EMAIL_TEMPLATE_DRAFT::${templateType}`;

const parseTemplateValue = (rawValue: string): AuthEmailTemplateRecord | null => {
  try {
    const parsed = JSON.parse(String(rawValue || "{}"));
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.templateType || !parsed.subject || !parsed.html || !parsed.text) return null;
    return {
      templateType: parsed.templateType,
      subject: String(parsed.subject),
      html: String(parsed.html),
      text: String(parsed.text),
      status: parsed.status === "published" ? "published" : "draft",
      version: Number(parsed.version || 1),
      updatedBy: parsed.updatedBy ? String(parsed.updatedBy) : null,
      updatedAt: String(parsed.updatedAt || nowIso()),
    };
  } catch {
    return null;
  }
};

const toRecord = (
  templateType: AuthEmailTemplateType,
  status: AuthEmailTemplateStatus,
  input: { subject: string; html: string; text: string; version?: number; updatedBy?: string | null }
): AuthEmailTemplateRecord => ({
  templateType,
  subject: String(input.subject || ""),
  html: String(input.html || ""),
  text: String(input.text || ""),
  status,
  version: Number(input.version || 1),
  updatedBy: input.updatedBy || null,
  updatedAt: nowIso(),
});

export const getAuthTemplateTypes = () => TEMPLATE_TYPES.slice();

export const getDefaultAuthTemplate = (templateType: AuthEmailTemplateType): AuthEmailTemplateRecord =>
  ({
    ...defaultTemplate(templateType),
    status: "published",
    version: 1,
    updatedBy: null,
    updatedAt: nowIso(),
  });

export const listAuthEmailTemplates = async () => {
  const result: Record<AuthEmailTemplateType, { published: AuthEmailTemplateRecord; draft: AuthEmailTemplateRecord | null }> = {
    signup_otp: { published: getDefaultAuthTemplate("signup_otp"), draft: null },
    signin_otp: { published: getDefaultAuthTemplate("signin_otp"), draft: null },
    forgot_password_otp: { published: getDefaultAuthTemplate("forgot_password_otp"), draft: null },
    verification_otp: { published: getDefaultAuthTemplate("verification_otp"), draft: null },
  };

  const keys = TEMPLATE_TYPES.flatMap((type) => [publishedKey(type), draftKey(type)]);
  const rows = await SystemConfigModel.find({ key: { $in: keys } }).select("key value").lean();
  const map = new Map(rows.map((row: any) => [String(row.key), String(row.value)]));

  for (const templateType of TEMPLATE_TYPES) {
    const publishedRaw = map.get(publishedKey(templateType));
    const draftRaw = map.get(draftKey(templateType));
    const parsedPublished = publishedRaw ? parseTemplateValue(publishedRaw) : null;
    const parsedDraft = draftRaw ? parseTemplateValue(draftRaw) : null;
    if (parsedPublished) result[templateType].published = parsedPublished;
    if (parsedDraft) result[templateType].draft = parsedDraft;
  }

  return result;
};

export const saveAuthEmailTemplateDraft = async (templateType: AuthEmailTemplateType, payload: { subject: string; html: string; text: string; updatedBy?: string | null }) => {
  const existing = await SystemConfigModel.findOne({ key: draftKey(templateType) }).select("value").lean();
  const current = existing?.value ? parseTemplateValue(String(existing.value)) : null;
  const next = toRecord(templateType, "draft", {
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    version: (current?.version || 0) + 1,
    updatedBy: payload.updatedBy || null,
  });
  await SystemConfigModel.findOneAndUpdate(
    { key: draftKey(templateType) },
    { value: JSON.stringify(next), updatedBy: payload.updatedBy || null },
    { upsert: true, new: true }
  );
  return next;
};

export const publishAuthEmailTemplate = async (templateType: AuthEmailTemplateType, updatedBy?: string | null) => {
  const draftRow = await SystemConfigModel.findOne({ key: draftKey(templateType) }).select("value").lean();
  const draft = draftRow?.value ? parseTemplateValue(String(draftRow.value)) : null;
  if (!draft) throw new Error("Draft template not found.");
  const published = toRecord(templateType, "published", {
    subject: draft.subject,
    html: draft.html,
    text: draft.text,
    version: draft.version,
    updatedBy: updatedBy || null,
  });
  await SystemConfigModel.findOneAndUpdate(
    { key: publishedKey(templateType) },
    { value: JSON.stringify(published), updatedBy: updatedBy || null },
    { upsert: true, new: true }
  );
  return published;
};

const sanitizeHtml = (value: string) =>
  String(value || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

export const renderAuthEmailTemplate = (template: AuthEmailTemplateRecord, context: AuthEmailTemplateContext) => {
  const vars: Record<string, string> = {
    code: String(context.code || ""),
    roleLabel: String(context.roleLabel || "Account"),
    expiresIn: String(context.expiresIn || "3 minutes"),
    supportEmail: String(context.supportEmail || "info@support.obaol.com"),
    appName: String(context.appName || "OBAOL"),
  };

  const replaceVars = (input: string) =>
    String(input || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => vars[String(key)] ?? "");

  return {
    subject: replaceVars(template.subject),
    text: replaceVars(template.text),
    html: sanitizeHtml(replaceVars(template.html)),
  };
};

export const getPublishedAuthEmailTemplate = async (templateType: AuthEmailTemplateType) => {
  const row = await SystemConfigModel.findOne({ key: publishedKey(templateType) }).select("value").lean();
  const parsed = row?.value ? parseTemplateValue(String(row.value)) : null;
  return parsed || getDefaultAuthTemplate(templateType);
};
