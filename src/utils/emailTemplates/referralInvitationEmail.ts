const escapeHtml = (value: unknown) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export const buildReferralInvitationEmail = (input: {
  recipientName: string;
  companyName: string;
  invitationUrl: string;
  rewardPercent: number;
}) => {
  const recipientName = String(input.recipientName || "there").trim();
  const companyName = String(input.companyName || "an OBAOL company").trim();
  const invitationUrl = String(input.invitationUrl || "").trim();
  const subject = `${companyName} invited you to join OBAOL`;
  const text = [
    `Hi ${recipientName},`,
    "",
    `${companyName} invited you to join OBAOL using a personal referral invitation.`,
    `Accept the invitation: ${invitationUrl}`,
    "",
    `After approval and activation, direct referrals can share in ${input.rewardPercent}% of OBAOL's realized profit from eligible later completed trades.`,
    "",
    "If you were not expecting this invitation, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="margin:0;padding:24px 12px;background:#f5f1e8;font-family:Arial,Helvetica,sans-serif;color:#172033">
      <div style="max-width:600px;margin:0 auto;background:#fffdf8;border:1px solid #ded5c5;border-radius:20px;overflow:hidden">
        <div style="padding:28px 30px 12px;font-weight:800;letter-spacing:2px;color:#d96f32">OBAOL</div>
        <div style="padding:8px 30px 30px">
          <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px">You have been invited to OBAOL</h1>
          <p style="font-size:15px;line-height:1.6">Hi ${escapeHtml(recipientName)},</p>
          <p style="font-size:15px;line-height:1.6"><strong>${escapeHtml(companyName)}</strong> invited you to join OBAOL using a personal referral invitation.</p>
          <p style="margin:26px 0"><a href="${escapeHtml(invitationUrl)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#ee8b4a;color:#172033;text-decoration:none;font-weight:700">Accept invitation</a></p>
          <p style="font-size:14px;line-height:1.6;color:#526078">After approval and activation, direct referrals can share in ${input.rewardPercent}% of OBAOL's realized profit from eligible later completed trades.</p>
          <p style="font-size:12px;line-height:1.6;color:#718096;word-break:break-all">If the button does not work, open: ${escapeHtml(invitationUrl)}</p>
          <p style="font-size:12px;line-height:1.6;color:#718096">If you were not expecting this invitation, you can ignore this email.</p>
        </div>
      </div>
    </div>`;
  return { subject, text, html };
};
