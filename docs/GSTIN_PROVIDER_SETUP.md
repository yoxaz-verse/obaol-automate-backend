# GSTIN provider setup

OBAOL verifies a company's GSTIN during onboarding through a licensed GST/GSP
taxpayer master-data API. OBAOL is the application/ASP; it does not need to
become a GST Suvidha Provider for this feature.

## Select and onboard a provider

Use GSTN's current empanelled GSP directory and request a GSTIN taxpayer or
master-data lookup product. Shortlist at least two providers and confirm:

- sandbox and production access, pricing, rate limits, and support SLA;
- server-to-server lookup and whether taxpayer OTP or consent is required;
- production IP allowlisting and data-retention requirements;
- legal name, trade name, registration status/date, constitution, taxpayer
  type, principal address, state code, jurisdictions, and business activities;
- request authentication, exact response samples, and test GSTINs.

Initial outreach shortlist (each appears in GSTN's empanelled directory):

1. Adaequare Info Private Limited
2. Binary Semantics Limited
3. Chartered Information Systems Private Limited (TaxPro)

Directory inclusion does not confirm that a provider currently sells the exact
lookup product OBAOL needs. Send the same requirements to all three and compare
their written API contracts, consent position, SLA, and total cost before making
a commercial selection.

Do not use the obsolete GSTN `/register-with-us` page and do not scrape the GST
portal. Official references:

- <https://www.gstn.org.in/empanelled-gsps>
- <https://www.gstn.org.in/gsp-ecosystem>

## Configure the backend

Store values in backend deployment secrets, with separate sandbox and
production credentials. Never expose them through frontend environment
variables or commit a populated `.env` file.

For a GET API with bearer authentication:

```env
GST_LOOKUP_URL=https://provider.example/gstin/{gstin}
GST_LOOKUP_PROVIDER=provider-name
GST_LOOKUP_METHOD=GET
GST_LOOKUP_API_KEY=secret-value
GST_LOOKUP_API_KEY_HEADER=Authorization
GST_LOOKUP_API_KEY_PREFIX=Bearer
GST_LOOKUP_PROOF_SECRET=independent-long-random-secret
GST_LOOKUP_TIMEOUT_MS=8000
GST_LOOKUP_CACHE_TTL_MS=21600000
GST_LOOKUP_RATE_LIMIT_MAX=10
```

For a JSON POST API, omit `{gstin}` from the URL if the provider expects the
identifier only in the body:

```env
GST_LOOKUP_URL=https://provider.example/taxpayer/search
GST_LOOKUP_METHOD=POST
GST_LOOKUP_BODY_TEMPLATE={"gstin":"{gstin}"}
```

An empty `GST_LOOKUP_API_KEY_PREFIX` sends the key exactly as supplied. Generate
the proof secret with `openssl rand -base64 48`. The proof secret is independent
of the provider API key and signs short-lived results accepted by onboarding.

OAuth token exchange, encrypted payloads, request signing, or multiple secret
headers require a provider-specific adapter; obtain the provider's API contract
before implementing one. The public OBAOL endpoint remains
`POST /auth/register/gstin/lookup` with `{ "gstin": "..." }`.

## Production verification

In sandbox and again after production allowlisting, verify active, cancelled,
unknown, malformed, and checksum-invalid GSTINs. Exercise rejected credentials,
provider throttling, timeout, outage, and malformed-response cases. Confirm the
onboarding form fills the verified legal name and registered address, and only
an active registration receives a verification proof.

Application logs intentionally contain only the GSTIN suffix, provider name,
and registration status for successful lookups. They must never include API
credentials, request headers, proof tokens, or full provider payloads.
