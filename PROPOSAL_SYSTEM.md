# Proposal System

Public proposal links use cryptographically secure opaque tokens. The raw token belongs only in the proposal URL; the database stores `publicTokenHash`, `publicTokenHint`, expiration, revocation, and public visibility flags.

Lookup rules return a generic unavailable state for invalid, revoked, deleted, draft, declined, or cancelled proposals. Expired proposals get a safe expired state without leaking internal details.

Status transitions are centralized in `src/server/proposals/transitions.ts`. The supported happy path is:

`DRAFT -> SENT -> VIEWED -> APPROVED -> SIGNATURE_PENDING -> PAYMENT_PENDING -> DEPOSIT_PAID -> ACTIVE`

Phase 2 stops at `PAYMENT_PENDING`. Stripe Checkout starts in Phase 3.

Phase 3 starts deposit checkout only for accepted proposals in `PAYMENT_PENDING` with a valid immutable acceptance and unpaid deposit schedule item. Confirmed deposits move proposals through `DEPOSIT_PAID` and then `ACTIVE` only after project activation succeeds.

View tracking is idempotent for first-view events. The first `viewedAt` timestamp is preserved, `lastViewedAt` updates on later valid views, and activity/audit/outbox records are created only for the first valid view.

Internal proposal management supports list filtering/search, template-based creation, publishing, token rotation, token revocation, first/last view review, acceptance review, and acceptance-summary download where a raw token is available.

Database-dependent verification requires a reachable PostgreSQL connection:

- `npm run db:migrate`
- `npm run db:seed`
- database integration tests for real duplicate acceptance constraints and transactional writes
