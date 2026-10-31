# Mobile identity configuration

`POST /api/v1/web/auth/google` accepts tokens issued to the configured web, Android, or iOS Google audiences. `POST /api/v1/web/auth/apple` accepts Apple identity tokens for the Services ID or iOS bundle ID and uses the same HTTP-only `auth_token` session cookie as password authentication.

Required production variables:

```text
GOOGLE_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
APPLE_SERVICE_ID=
APPLE_IOS_BUNDLE_ID=com.obaol.app
```

Multiple audiences may be comma-separated during a credential rotation. Never place an Apple private key in the mobile binary or frontend environment. Apple identities are linked only when Apple supplies a verified email, and a stored Apple subject cannot be replaced by a different subject through login.
