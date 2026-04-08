// utils/mailer.ts

import mailjet from "node-mailjet";
import { t } from "./i18n";

const safeStringify = (value: any) => {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    },
    2
  );
};

const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY || "1232159e0de6174b723725c726be4ac8",
  process.env.MAILJET_SECRET_KEY || "30ba632a67b1f1b305ccbe70155ab9a0"
);

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

export async function sendOtpEmail(toEmail: string, code: string, lang: string = "en", userType?: string) {
  console.log(`📧 Attempting to send OTP email to: ${toEmail} with code: ${code} (Lang: ${lang})`);
  try {
    const roleLabel = normalizeSignupRole(userType);
    const subject = roleLabel === "Account"
      ? `OBAOL OTP Code`
      : `OBAOL ${roleLabel} Signup OTP`;
    const textPart =
      roleLabel === "Account"
        ? `Your OBAOL verification code is ${code}. This code expires in 3 minutes. Do not share this code.`
        : `Your OBAOL ${roleLabel} signup verification code is ${code}. This code expires in 3 minutes. Do not share this code.`;
    const htmlPart = buildOtpHtml(subject, code, roleLabel, lang);

    const result = await mailjetClient
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL || "obaol.biz@gmail.com",
              Name: t("Obaol Verification", lang),
            },
            To: [{ Email: toEmail }],
            Subject: subject,
            TextPart: textPart,
            HTMLPart: htmlPart,
          },
        ],
      });

    console.log("✅ Email sent successfully to:", toEmail, "Result:", JSON.stringify(result.body, null, 2));
  } catch (error: any) {
    console.error(
      "❌ Failed to send Mailjet email to:", toEmail,
      "Error:", error.response?.data || error.message,
      "Full Error Object:", safeStringify(error)
    );
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

export async function sendTradeDocumentEmail(
  toEmail: string,
  subject: string,
  htmlPart: string,
  textPart: string
) {
  console.log(`📧 Sending trade document email to: ${toEmail}`);
  try {
    const result = await mailjetClient
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL || "obaol.biz@gmail.com",
              Name: "OBAOL Trade Desk",
            },
            To: [{ Email: toEmail }],
            Subject: subject,
            TextPart: textPart,
            HTMLPart: htmlPart,
          },
        ],
      });

    console.log("✅ Trade doc email sent:", JSON.stringify(result.body, null, 2));
  } catch (error: any) {
    console.error(
      "❌ Failed to send trade document email to:",
      toEmail,
      "Error:",
      error.response?.data || error.message
    );
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

// API Key
// 1232159e0de6174b723725c726be4ac8

// Secret Key
// 30ba632a67b1f1b305ccbe70155ab9a0
