import { OAuth2Client } from "google-auth-library";

const getGoogleClientId = () => String(process.env.GOOGLE_CLIENT_ID || "").trim();

export type GoogleTokenPayload = {
    email: string;
    name?: string;
    sub: string;
    email_verified?: boolean;
};

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleTokenPayload> => {
    const clientId = getGoogleClientId();
    if (!clientId) {
        throw new Error("Google client id is not configured.");
    }
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
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
