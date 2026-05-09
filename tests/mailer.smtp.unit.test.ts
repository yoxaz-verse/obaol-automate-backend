import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

describe("mailer smtp sender mapping", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

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
});
