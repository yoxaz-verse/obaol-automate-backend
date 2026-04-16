export const PRE_AUTH_BLOCKED_MESSAGE = "This account is banned/blocked from OBAOL backend. Access is disabled.";

const BLOCKED_REGISTRATION_STATUSES = new Set(["REJECTED", "BLOCKED"]);

const normalizeStatus = (status: any) => String(status || "").trim().toUpperCase();

export const isRegistrationBlocked = (status: any) => {
    return BLOCKED_REGISTRATION_STATUSES.has(normalizeStatus(status));
};

export const resolvePreAuthBlockedState = (userDoc: any) => {
    if (!userDoc) return { blocked: false as const };

    if (Boolean(userDoc.isDeleted)) {
        return {
            blocked: true as const,
            message: PRE_AUTH_BLOCKED_MESSAGE,
            rejectionReason: String(userDoc.reviewNotes || "").trim() || undefined,
        };
    }

    if (isRegistrationBlocked(userDoc.registrationStatus)) {
        return {
            blocked: true as const,
            message: PRE_AUTH_BLOCKED_MESSAGE,
            rejectionReason: String(userDoc.reviewNotes || "").trim() || undefined,
        };
    }

    if (userDoc.isActive === false) {
        return {
            blocked: true as const,
            message: PRE_AUTH_BLOCKED_MESSAGE,
            rejectionReason: String(userDoc.reviewNotes || "").trim() || undefined,
        };
    }

    return { blocked: false as const };
};

export const toBlockedResponsePayload = (userDoc: any) => {
    const blockedState = resolvePreAuthBlockedState(userDoc);
    if (!blockedState.blocked) return null;
    return {
        success: false,
        status: "blocked",
        message: PRE_AUTH_BLOCKED_MESSAGE,
        ...(blockedState.rejectionReason ? { rejectionReason: blockedState.rejectionReason } : {}),
    };
};
