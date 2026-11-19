import { describe, expect, it } from "vitest";
import { buildReferralInvitationEmail } from "../src/utils/emailTemplates/referralInvitationEmail";

describe("referral invitation email template", () => {
  it("includes the personalized company invitation and tokenized registration link", () => {
    const result = buildReferralInvitationEmail({
      recipientName: "Acme <Foods>",
      companyName: "Referrer & Co",
      invitationUrl: "https://obaol.example/auth/register?role=associate&ref=ABC12345&invite=secret",
      rewardPercent: 10,
    });

    expect(result.subject).toContain("Referrer & Co");
    expect(result.text).toContain("ref=ABC12345&invite=secret");
    expect(result.text).toContain("Acme <Foods>");
    expect(result.html).toContain("Acme &lt;Foods&gt;");
    expect(result.html).toContain("Referrer &amp; Co");
    expect(result.html).toContain("ref=ABC12345&amp;invite=secret");
  });
});
