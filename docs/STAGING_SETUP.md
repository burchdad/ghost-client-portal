# Staging Setup

Use staging to rehearse the Gray Matters launch without live money movement.

## Requirements

- `APP_ENV=staging`
- Stripe test secret and publishable keys
- Stripe test webhook secret
- A staging database isolated from production
- Seed or manually create staging-only test data

## Checks

- Proposal publish flow
- Proposal view and acceptance
- Test-mode Checkout Session creation
- Webhook processing with test events
- Project activation after a test payment
- Client dashboard, payments, project, and onboarding pages

Never use live Stripe keys in staging.

## Fake-Client Production Rehearsal

The production fake-client workflow is documented separately in `docs/CLIENT_LIFECYCLE_TEST_RUNBOOK.md`. It exists so production email, auth, proposal, invitation, dashboard, and Stripe handoff guards can be checked without touching Gray Matters records.
