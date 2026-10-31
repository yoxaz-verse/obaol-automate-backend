import { OAuth2Client } from "google-auth-library";

const getGoogleClientIds = () => [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

export type GoogleTokenPayload = {
    email: string;
    name?: string;
    sub: string;
    email_verified?: boolean;
};

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleTokenPayload> => {
    const clientIds = getGoogleClientIds();
    if (clientIds.length === 0) {
        throw new Error("Google client ids are not configured.");
    }
    const client = new OAuth2Client(clientIds[0]);
    const ticket = await client.verifyIdToken({
        idToken,
        audience: clientIds,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
        throw new Error("Google token payload is missing required fields.");
    }
    return {
        email: String(payload.email).toLowerCase(),
        name: payload.name ? String(payload.name) : undefined,
        sub: String(payload.sub),
        email_verified: Boolean(payload.email_verified),
    };
};
