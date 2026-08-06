# Transactional email via Resend API

Email sending (verify, invite, password-reset) was initially stubbed with `console.warn` fallback. We wired it to Resend's REST API (`POST https://api.resend.com/emails` with `Authorization: Bearer <EMAIL_API_KEY>`).

The `FROM` address is configurable in code (`src/lib/email.ts`, currently `noreply@expense.patrickho.ca`). The `EMAIL_API_KEY` env var controls whether real emails are sent. When absent, the stub behavior (console.warn with the link) remains.

Resend requires domain verification (TXT record) before it will send from a custom domain.
