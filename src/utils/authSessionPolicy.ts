export const PERSISTENT_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const TRANSIENT_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;
export const PERSISTENT_SESSION_RENEWAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const LEGACY_REMEMBER_ME_MINIMUM_LIFETIME_SECONDS = 20 * 60 * 60;

type TokenTiming = {
  persistent?: boolean;
  iat?: number;
  exp?: number;
};

export const isPersistentSessionToken = (token: TokenTiming) => {
  if (token.persistent === true) return true;
  if (!token.iat || !token.exp) return false;
  return token.exp - token.iat >= LEGACY_REMEMBER_ME_MINIMUM_LIFETIME_SECONDS;
};

export const shouldRenewPersistentSession = (
  token: TokenTiming,
  nowMs = Date.now(),
) => {
  if (!isPersistentSessionToken(token) || !token.exp) return false;
  return token.exp * 1000 - nowMs <= PERSISTENT_SESSION_RENEWAL_WINDOW_MS;
};
