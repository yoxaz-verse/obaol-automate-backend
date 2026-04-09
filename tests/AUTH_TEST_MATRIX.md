# Auth Test Matrix (Automate Backend)

## Login (`POST /api/v1/web/login`)
- Missing email/password -> 400
- Invalid credentials -> 401
- Inactive user -> 401
- Associate pending approval (onboardingComplete + registrationStatus != APPROVED) -> 401
- Operator pending approval (onboardingComplete + registrationStatus != APPROVED) -> 401
- Successful login (Associate) -> 200 + `Set-Cookie: auth_token`
- Successful login (Operator) -> 200 + `Set-Cookie: auth_token`
- rememberMe true -> cookie max-age reflects longer TTL

## Verify Token (`GET /api/v1/web/verify-token`)
- Missing token -> 401
- Valid cookie token (Associate) -> 200 + user payload
- Valid cookie token (Operator) -> 200 + user payload
