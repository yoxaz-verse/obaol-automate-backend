// utils/mailer.ts

import nodemailer from "nodemailer";
import { t } from "./i18n";
import {
  AuthEmailTemplateType,
  getPublishedAuthEmailTemplate,
  renderAuthEmailTemplate,
} from "./authEmailTemplates";

type MailPurpose = "auth" | "notify" | "support";

const resolveSmtpSecure = (): boolean => {
  const raw = String(process.env.SMTP_SECURE || "").trim().toLowerCase();
  if (!raw) return false;
  return raw === "true" || raw === "1" || raw === "yes";
};

const resolveSmtpPort = (): number => {
  const parsed = Number(process.env.SMTP_PORT || 587);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
};

const senderByPurpose = (purpose: MailPurpose) => {
  const authUser = String(process.env.SMTP_AUTH_USER || "").trim();
  const notifyUser = String(process.env.SMTP_NOTIFY_USER || "").trim();
  const supportUser = String(process.env.SMTP_SUPPORT_USER || "").trim();
  const authName = String(process.env.SMTP_AUTH_FROM_NAME || "OBAOL Verification").trim();
  const notifyName = String(process.env.SMTP_NOTIFY_FROM_NAME || "OBAOL Notifications").trim();
  const supportName = String(process.env.SMTP_SUPPORT_FROM_NAME || "OBAOL Support").trim();

  if (purpose === "auth") return { user: authUser, name: authName };
  if (purpose === "notify") return { user: notifyUser, name: notifyName };
  return { user: supportUser, name: supportName };
};

const transporterByPurpose = new Map<MailPurpose, nodemailer.Transporter>();

const getTransporter = (purpose: MailPurpose): nodemailer.Transporter => {
  const existing = transporterByPurpose.get(purpose);
  if (existing) return existing;

  const smtpHost = String(process.env.SMTP_HOST || "").trim();
  const smtpPassword = String(process.env.SMTP_AUTH_PASSWORD || "").trim();
  const { user } = senderByPurpose(purpose);

  if (!smtpHost || !smtpPassword || !user) {
    throw new Error(`SMTP configuration missing for purpose "${purpose}"`);
  }

  const created = nodemailer.createTransport({
    host: smtpHost,
    port: resolveSmtpPort(),
    secure: resolveSmtpSecure(),
    auth: {
      user,
      pass: smtpPassword,
    },
  });

  transporterByPurpose.set(purpose, created);
  return created;
};

export const verifySmtpTransport = async (purpose: MailPurpose = "auth") => {
  const transporter = getTransporter(purpose);
  if (typeof transporter.verify !== "function") return true;
  await transporter.verify();
  return true;
};

const sendEmail = async (purpose: MailPurpose, payload: { toEmail: string; subject: string; textPart: string; htmlPart: string; fromNameOverride?: string }) => {
  const { user, name } = senderByPurpose(purpose);
  const transporter = getTransporter(purpose);
  const fromName = String(payload.fromNameOverride || name || "").trim();

  return transporter.sendMail({
    from: fromName ? `"${fromName}" <${user}>` : user,
    to: payload.toEmail,
    subject: payload.subject,
    text: payload.textPart,
    html: payload.htmlPart,
  });
};

const normalizeSignupRole = (userType?: string) => {
  const role = String(userType || "").trim().toLowerCase();
  if (role === "associate") return "Associate";
  if (role === "operator" || role === "team") return "Operator";
  return "Account";
};

const buildOtpHtml = (subject: string, code: string, roleLabel: string, lang: string) => {
  const expiryLine = "This code expires in 3 minutes.";
  const roleLine = roleLabel === "Account"
    ? "You requested an OTP to verify your email."
    : `You requested an OTP for ${roleLabel} signup.`;
  return `
  <div style="margin:0;padding:0;background-color:#0f1115;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f1115;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;background:#141821;border-radius:24px;overflow:hidden;border:1px solid #202534;">
            <tr>
              <td style="padding:28px 28px 10px 28px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:18px;letter-spacing:2px;color:#f59e0b;">
                  OBAOL
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px 28px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:20px;color:#f5f7fb;margin:0 0 8px 0;">
                  ${subject}
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  ${roleLine}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 24px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="background:#0b0e14;border:1px solid #2b3444;border-radius:18px;min-width:260px;">
                  <tr>
                    <td style="padding:16px 22px;text-align:center;">
                      <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:26px;letter-spacing:6px;color:#fbbf24;font-weight:700;">
                        ${code}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 6px 28px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;line-height:1.6;">
                  ${expiryLine} Do not share this code with anyone.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 26px 28px;border-top:1px solid #202534;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;line-height:1.6;">
                  If you didn’t request this email, you can safely ignore it.
                </div>
              </td>
            </tr>
          </table>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#475569;margin-top:14px;">
            © OBAOL Trade Network
          </div>
        </td>
      </tr>
    </table>
  </div>
  `;
};

export async function sendOtpEmail(
  toEmail: string,
  code: string,
  lang: string = "en",
  userType?: string,
  authEmailType: AuthEmailTemplateType = "verification_otp"
) {
  console.log(`📧 Attempting to send OTP email to: ${toEmail} (Lang: ${lang})`);
  try {
    const roleLabel = normalizeSignupRole(userType);
    const template = await getPublishedAuthEmailTemplate(authEmailType);
    const rendered = renderAuthEmailTemplate(template, {
      code,
      roleLabel,
      expiresIn: "3 minutes",
      supportEmail: "info@support.obaol.com",
      appName: "OBAOL",
    });
    const subject = rendered.subject || (roleLabel === "Account" ? "OBAOL OTP Code" : `OBAOL ${roleLabel} Signup OTP`);
    const textPart =
      rendered.text ||
      (roleLabel === "Account"
        ? `Your OBAOL verification code is ${code}. This code expires in 3 minutes. Do not share this code.`
        : `Your OBAOL ${roleLabel} signup verification code is ${code}. This code expires in 3 minutes. Do not share this code.`);
    const htmlPart = rendered.html || buildOtpHtml(subject, code, roleLabel, lang);

    const result = await sendEmail("auth", {
      toEmail,
      subject,
      textPart,
      htmlPart,
      fromNameOverride: t("Obaol Verification", lang),
    });
    console.log("✅ Email sent successfully to:", toEmail, "MessageId:", result.messageId);
  } catch (error: any) {
    console.error(
      "❌ Failed to send SMTP email to:", toEmail,
      "Error:", error.message
    );
    throw new Error("Unable to send verification email. Please try again.");
  }
}

export async function sendAuthTemplateTestEmail(
  toEmail: string,
  templateType: AuthEmailTemplateType,
  content: { subject: string; html: string; text: string },
  context: { code?: string; roleLabel?: string; expiresIn?: string; supportEmail?: string; appName?: string } = {}
) {
  const rendered = renderAuthEmailTemplate(
    {
      templateType,
      subject: String(content.subject || ""),
      html: String(content.html || ""),
      text: String(content.text || ""),
      status: "draft",
      version: 1,
      updatedBy: null,
      updatedAt: new Date().toISOString(),
    },
    {
      code: String(context.code || "123456"),
      roleLabel: String(context.roleLabel || "Account"),
      expiresIn: String(context.expiresIn || "3 minutes"),
      supportEmail: String(context.supportEmail || "info@support.obaol.com"),
      appName: String(context.appName || "OBAOL"),
    }
  );

  return sendEmail("auth", {
    toEmail,
    subject: rendered.subject,
    textPart: rendered.text,
    htmlPart: rendered.html,
  });
}

export async function sendTradeDocumentEmail(
  toEmail: string,
  subject: string,
  htmlPart: string,
  textPart: string
) {
  console.log(`📧 Sending trade document email to: ${toEmail}`);
  try {
    const result = await sendEmail("notify", {
      toEmail,
      subject,
      textPart,
      htmlPart,
      fromNameOverride: "OBAOL Trade Desk",
    });
    console.log("✅ Trade doc email sent. MessageId:", result.messageId);
  } catch (error: any) {
    console.error(
      "❌ Failed to send trade document SMTP email to:",
      toEmail,
      "Error:", error.message
    );
    throw new Error(`Email sending failed: ${error.message}`);
  }
}
