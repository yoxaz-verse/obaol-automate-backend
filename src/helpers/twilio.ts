import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SENDER_PHONE } from "../config";
import twilio from "twilio";

export async function sendOtpSMS(
  phoneNumber: string,
  otp: number
): Promise<void> {
  const accountId = TWILIO_ACCOUNT_SID;
  const authToken = TWILIO_AUTH_TOKEN;
  const client = twilio(accountId, authToken);
  console.log(client);
  // Define the sms content with template variables
  const smsOption = {
    from: SENDER_PHONE,
    to: "+91 7306096941",
    body: `Your OTP: *${otp}*. This OTP is valid for a single use and will expire in 10 minutes.`,
  };

  // Send sms using Twilio
  try {
    const response = await client.messages.create(smsOption);
    console.log("SMS sent successfully: ", response);
  } catch (error) {
    console.error("SMS sending failed: ", error);
  }
}
