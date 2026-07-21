# Stripe Setup

Phase 3 includes Checkout Session and webhook foundations. Real test-mode verification still requires Stripe credentials, a reachable PostgreSQL database, and a webhook listener.

Required environment variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- optional `STRIPE_API_VERSION`

Payment amounts must be loaded from trusted proposal and payment schedule records. Browser-submitted amounts are never authoritative.

Webhook processing must verify signatures, persist `StripeEvent`, avoid duplicate processing, map metadata to internal records, and be safe to retry.

Stripe CLI verification:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Set the returned secret as `STRIPE_WEBHOOK_SECRET`. Complete a real test-mode Checkout Session through the app to test application metadata. Generic `stripe trigger` events are useful for signature plumbing but may not include portal metadata.
