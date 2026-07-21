# Security

Phase 1 implements HTTP-only cookie session foundations, bcrypt password hashing, server-side authorization helpers, tenant-scoped query patterns, secure response headers, and immutable audit-log models.

Clients must never receive internal notes, profit data, contractor information, agent logs, internal delivery discussions, NOVA recommendations, private credentials, other tenant records, or unapproved drafts.

Required production practices:

- Use long random `AUTH_SECRET` values and rotate secrets after incidents.
- Keep all secrets server-only.
- Validate all mutations with Zod.
- Verify Stripe webhook signatures.
- Process webhooks idempotently through `StripeEvent`.
- Store proposal public tokens only as hashes.
- Re-check authorization in every server component, server action, and route handler.
- Keep audit logs append-only through normal application paths.

## Phase 2 Proposal Controls

- Public proposal lookup returns generic unavailable states for invalid, revoked, deleted, draft, declined, or cancelled proposals.
- Proposal tokens are generated with cryptographic randomness and stored as SHA-256 hashes.
- Acceptance submissions perform server-side Zod validation, same-origin checks, input-size limits, rate limiting, idempotency checks, and controlled status transitions.
- Pricing and payment schedule values are loaded from trusted proposal records, never from the browser.
- Acceptance records are immutable through normal application workflows. Corrections require replacement records or administrative audit events.
- IP capture uses forwarded headers when available; production reliability depends on Vercel or proxy header configuration.

## Phase 3 Payment Controls

- Stripe secret keys and webhook secrets are server-only.
- Checkout Sessions are created from trusted database records only.
- Checkout creation uses same-origin checks, rate limiting, token redaction, and Stripe idempotency keys.
- Webhooks read the raw request body and verify Stripe signatures before processing.
- Stripe event IDs are persisted to prevent replay and duplicate processing.
- Amount and currency are cross-checked against internal payment and payment schedule records.
- Redirect success pages query persisted payment state and never mark payment successful.
- Refunds create internal review signals; clients cannot initiate refunds.
