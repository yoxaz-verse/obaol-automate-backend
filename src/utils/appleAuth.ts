import crypto from "node:crypto";
import jwt, { JwtHeader, JwtPayload } from "jsonwebtoken";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = `${APPLE_ISSUER}/auth/keys`;
const KEY_CACHE_MS = 60 * 60 * 1000;

type AppleJwk = Record<string, string> & { kid?: string };
let keyCache: { expiresAt: number; keys: AppleJwk[] } | null = null;

const configuredAudiences = () => [process.env.APPLE_SERVICE_ID, process.env.APPLE_IOS_BUNDLE_ID]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

const getAppleKeys = async () => {
    if (keyCache && keyCache.expiresAt > Date.now()) return keyCache.keys;
    const response = await fetch(APPLE_KEYS_URL, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Unable to load Apple signing keys.");
    const body = await response.json() as { keys?: AppleJwk[] };
    if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error("Apple signing keys are unavailable.");
    keyCache = { keys: body.keys, expiresAt: Date.now() + KEY_CACHE_MS };
    return body.keys;
};

export type AppleTokenPayload = {
    email?: string;
    sub: string;
    email_verified: boolean;
};

export const verifyAppleIdentityToken = async (identityToken: string, rawNonce?: string): Promise<AppleTokenPayload> => {
    const audiences = configuredAudiences();
    if (audiences.length === 0) throw new Error("Apple sign-in audiences are not configured.");
    const decoded = jwt.decode(identityToken, { complete: true });
    const header = decoded?.header as JwtHeader | undefined;
    if (!header?.kid || header.alg !== "RS256") throw new Error("Apple identity token header is invalid.");
    const jwk = (await getAppleKeys()).find((candidate) => candidate.kid === header.kid);
    if (!jwk) throw new Error("Apple identity token key is unknown.");
    const key = crypto.createPublicKey({ key: jwk as any, format: "jwk" });
    const payload = jwt.verify(identityToken, key, {
        algorithms: ["RS256"],
        issuer: APPLE_ISSUER,
        audience: audiences as [string, ...string[]],
    }) as JwtPayload;
    if (!payload.sub) throw new Error("Apple identity token subject is missing.");
    if (rawNonce) {
        const expected = crypto.createHash("sha256").update(rawNonce).digest("hex");
        if (payload.nonce !== expected) throw new Error("Apple identity token nonce is invalid.");
    }
    return {
        sub: String(payload.sub),
        email: payload.email ? String(payload.email).trim().toLowerCase() : undefined,
        email_verified: payload.email_verified === true || payload.email_verified === "true",
    };
};
