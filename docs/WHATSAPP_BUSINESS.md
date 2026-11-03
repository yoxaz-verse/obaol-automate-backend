# WhatsApp Business setup

OBAOL uses Meta Cloud API and Embedded Signup. Configure the environment values documented in `.env.example`, register the frontend domain in the Meta app, and subscribe the webhook URL `/api/v1/web/whatsapp/webhook` to the `messages` field.

Create and approve these templates in WhatsApp Manager:

- `obaol_trade_document_v1` (`en_US` by default): a **document header**, three body text variables in this order—recipient name, document type, document number—and one dynamic URL button whose fixed prefix is the OBAOL public origin (`https://obaol.com/`). OBAOL supplies `documents/share/<token>` as the suffix.
- `obaol_participation_invitation_v1`: two body text variables—recipient name and inviting company—and one dynamic URL button with the same public-origin prefix. OBAOL supplies the registration path and referral query string as the suffix.

The Meta app requires `whatsapp_business_management` and `whatsapp_business_messaging`. Production use also requires Meta business verification, app review where applicable, an HTTPS API endpoint, and approved templates in every configured language.

Webhook signatures are verified with `META_APP_SECRET`. Delivery states are monotonic from sent to delivered to read; failed events retain Meta's bounded error code and message. Tokens are encrypted at rest and are never returned by status APIs.
