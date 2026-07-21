# Client Portal Roadmap

## Phase 1

Scaffold, Prisma schema, authentication, multi-tenant organizations, authorization helpers, base layouts, seed data, and tenant-isolation tests.

## Phase 2

Proposal engine, secure public proposal route, proposal acceptance, typed signature, and proposal activity tracking.

Implemented foundation:

- Public token lookup, expiry, revocation, rotation, and safe unavailable states
- Public proposal display
- Idempotent first-view tracking
- Typed-signature acceptance
- Immutable proposal snapshot and content/payload hashes
- Acceptance summary HTML download
- Internal proposal list, create, publish, rotate, revoke, and acceptance review

## Phase 3

Stripe Checkout, webhook processing, payment schedules, payment confirmation, and project activation.

Implemented foundation:

- Trusted deposit eligibility checks
- Stripe customer create/reuse service
- Checkout Session creation service
- Webhook signature verification route
- Idempotent Stripe event persistence
- Deposit confirmation, failed payment, and refund foundations
- Project and onboarding activation services
- Admin payment visibility and recovery indicators

## Phase 4

First real client lifecycle: environment separation, payment recovery, client dashboard, project workspace, onboarding, client actions, and invitations.

## Phase 5

Onboarding, messages, support requests, notifications, and change-order foundation.
