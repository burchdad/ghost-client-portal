# Stripe Lifecycle Test Plan

## Read-Only Production Review

- Review stored Checkout Session status in the admin payments page.
- Confirm amount and currency match the local payment record.
- Confirm Stripe livemode matches `APP_ENV=production`.
- Do not create replacement sessions until the existing session is reviewed.

## Staging Execution

- Create a test Checkout Session from an accepted test proposal.
- Complete payment with a Stripe test card.
- Confirm webhook stores the PaymentIntent.
- Confirm proposal transitions to active and project onboarding becomes visible.
- Confirm recovery retry refuses to run without a succeeded matching PaymentIntent.
- Confirm an expired unpaid live Checkout Session can be marked abandoned internally without Stripe mutation.

## Forbidden In Production During Readiness

- Creating new live Checkout Sessions for testing.
- Expiring or canceling live sessions.
- Refunding charges.
- Sending receipt or invitation emails before launch approval.

## Fake-Client Guard

Test proposals marked with `isTestRecord=true` require the operator phrase `CREATE UNPAID LIVE TEST CHECKOUT` before creating a production Checkout Session. This permits handoff validation only; completing a live charge remains forbidden during general lifecycle validation.
