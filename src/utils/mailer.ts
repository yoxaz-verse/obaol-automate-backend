// utils/mailer.ts

import mailjet from "node-mailjet";
import { t } from "./i18n";

const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY || "1232159e0de6174b723725c726be4ac8",
  process.env.MAILJET_SECRET_KEY || "30ba632a67b1f1b305ccbe70155ab9a0"
);

export async function sendOtpEmail(toEmail: string, code: string, lang: string = "en") {
  console.log(`📧 Attempting to send OTP email to: ${toEmail} with code: ${code} (Lang: ${lang})`);
  try {
    const subject = t("Your OTP Code", lang);
    const textPart = t("Your verification code is: {code}", lang, { code });
    const htmlPart = `<h3>${subject}</h3><p><strong>${code}</strong></p><p>${t("This code will expire shortly.", lang)}</p>`;

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
      "Full Error Object:", JSON.stringify(error, null, 2)
    );
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

// API Key
// 1232159e0de6174b723725c726be4ac8

// Secret Key
// 30ba632a67b1f1b305ccbe70155ab9a0
