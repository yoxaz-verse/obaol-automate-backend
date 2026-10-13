import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.fn();
const verifyMock = vi.fn();
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock, verify: verifyMock }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

describe("mailer smtp sender mapping", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    verifyMock.mockResolvedValue(true);

    process.env.SMTP_HOST = "chocobo.mxrouting.net";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_AUTH_PASSWORD = "test-password";
    process.env.SMTP_AUTH_USER = "no-reply@auth.obaol.com";
    process.env.SMTP_NOTIFY_USER = "no-reply@notify.obaol.com";
    process.env.SMTP_SUPPORT_USER = "info@support.obaol.com";
  });

  it("uses auth sender for OTP emails", async () => {
    sendMailMock.mockResolvedValueOnce({ messageId: "auth-msg-1" });
    const { sendOtpEmail } = await import("../src/utils/mailer");

    await sendOtpEmail("user@example.com", "123456", "en", "associate");

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "chocobo.mxrouting.net",
        port: 587,
        secure: false,
        auth: expect.objectContaining({
          user: "no-reply@auth.obaol.com",
          pass: "test-password",
        }),
      })
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        from: expect.stringContaining("<no-reply@auth.obaol.com>"),
      })
    );
  });

  it("uses notify sender for trade document emails", async () => {
    sendMailMock.mockResolvedValueOnce({ messageId: "notify-msg-1" });
    const { sendTradeDocumentEmail } = await import("../src/utils/mailer");

    await sendTradeDocumentEmail(
      "buyer@example.com",
      "Trade Document",
      "<p>hello</p>",
      "hello"
    );

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          user: "no-reply@notify.obaol.com",
        }),
      })
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        from: expect.stringContaining("<no-reply@notify.obaol.com>"),
      })
    );
  });

  it("uses notify sender for approval notification emails", async () => {
    process.env.BASE_URL = "https://obaol.example";
    sendMailMock.mockResolvedValueOnce({ messageId: "approval-msg-1" });
    const { sendApprovalNotificationEmail } = await import("../src/utils/mailer");

    await sendApprovalNotificationEmail({
      toEmail: "associate@example.com",
      approvedName: "Approved Associate",
      accountEmail: "associate@example.com",
      roleLabel: "Associate",
      loginPath: "/auth",
    });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          user: "no-reply@notify.obaol.com",
        }),
      })
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "associate@example.com",
        from: expect.stringContaining("<no-reply@notify.obaol.com>"),
        subject: expect.stringContaining("OBAOL Supreme"),
        text: expect.stringContaining("https://obaol.example/auth"),
        html: expect.stringContaining("Username / Email ID"),
      })
    );
  });

  it("sends a distinct, escaped company registration notice with a support review action", async () => {
    sendMailMock.mockResolvedValueOnce({ messageId: "company-registration-msg-1" });
    const { sendCompanyRegistrationNoticeEmail } = await import("../src/utils/mailer");

    await sendCompanyRegistrationNoticeEmail({
      toEmail: "company@example.com",
      companyId: "company-123",
      companyName: "Tea & Spice <Exports>",
      associateName: "Asha & Co <Owner>",
      associateEmail: "asha+trade@example.com",
      supportEmail: "info@support.obaol.com",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "company@example.com",
        from: expect.stringContaining("<no-reply@notify.obaol.com>"),
        subject: "Asha & Co <Owner> registered Tea & Spice <Exports> on OBAOL Supreme",
        text: expect.stringContaining("Someone registered your company"),
        html: expect.stringContaining("Someone registered your company"),
      })
    );
    const payload = sendMailMock.mock.calls[0][0];
    expect(payload.html).toContain("Tea &amp; Spice &lt;Exports&gt;");
    expect(payload.html).toContain("Asha &amp; Co &lt;Owner&gt;");
    expect(payload.html).toContain("mailto:info@support.obaol.com?subject=");
    expect(payload.html).toContain("Review registration");
    expect(payload.html).not.toContain("Check out and login");
    expect(payload.text).toContain("Company ID: company-123");
    expect(payload.text).toContain("Associate%20email%3A%20asha%2Btrade%40example.com");
  });

  it("verifies smtp transport without sending mail", async () => {
    const { verifySmtpTransport } = await import("../src/utils/mailer");

    await expect(verifySmtpTransport("auth")).resolves.toBe(true);

    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
