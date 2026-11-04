const maskEmail = (value: string) => {
  const [local = "", domain = ""] = String(value || "").split("@");
  return domain ? `${local.slice(0, 2)}***@${domain}` : "";
};

const maskPhone = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `+${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}` : "";
};

export const accountVerificationStatus = (user: any) => {
  const emailVerified = user?.isEmailVerified === true;
  const phoneVerified = user?.isPhoneVerified === true;
  const fullyVerified = emailVerified && phoneVerified;
  const rolloutRaw = String(process.env.ACCOUNT_VERIFICATION_ROLLOUT_AT || "").trim();
  const rolloutAt = rolloutRaw ? new Date(rolloutRaw) : null;
  const validRollout = rolloutAt && !Number.isNaN(rolloutAt.getTime()) ? rolloutAt : null;
  const graceDays = Math.max(0, Number(process.env.ACCOUNT_VERIFICATION_GRACE_DAYS || 30));
  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
  const isNewAccount = Boolean(validRollout && createdAt && createdAt >= validRollout);
  const graceEnd = validRollout && !isNewAccount ? new Date(validRollout.getTime() + graceDays * 86400000) : validRollout;
  const verificationRequired = !fullyVerified && Boolean(graceEnd && Date.now() >= graceEnd.getTime());
  return {
    emailVerified,
    phoneVerified,
    fullyVerified,
    requiredNextChannel: !emailVerified ? "email" : !phoneVerified ? "whatsapp" : null,
    maskedEmail: maskEmail(user?.email),
    maskedPhone: maskPhone(user?.phone),
    verificationGraceEndsAt: graceEnd?.toISOString() || null,
    verificationRequired,
  };
};
