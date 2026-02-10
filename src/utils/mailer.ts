// utils/mailer.ts

import mailjet from "node-mailjet";

const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY || "1232159e0de6174b723725c726be4ac8",
  process.env.MAILJET_SECRET_KEY || "30ba632a67b1f1b305ccbe70155ab9a0"
);

export async function sendOtpEmail(toEmail: string, code: string) {
  console.log(`📧 Attempting to send OTP email to: ${toEmail} with code: ${code}`);
  try {
    const result = await mailjetClient
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL || "obaol.biz@gmail.com",
              Name: "Obaol Verification",
            },
            To: [{ Email: toEmail }],
            Subject: "Your OTP Code",
            TextPart: `Your verification code is: ${code}`,
            HTMLPart: `<h3>Your OTP Code</h3><p><strong>${code}</strong></p><p>This code will expire shortly.</p>`,
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
