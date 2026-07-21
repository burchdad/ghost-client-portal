# Stripe Webhooks

Endpoint: `/api/stripe/webhook`

The route reads the raw request body, verifies `stripe-signature` using `STRIPE_WEBHOOK_SECRET`, persists `StripeEvent`, and rejects invalid signatures.

Implemented events:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

No-op foundations:

- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Webhook processing is idempotent by Stripe event ID. Amount and currency are cross-checked against trusted internal records before payment confirmation.

Webhook processing checks event livemode against `APP_ENV`. Mismatched events are recorded as recovery-required instead of marking payments paid.
