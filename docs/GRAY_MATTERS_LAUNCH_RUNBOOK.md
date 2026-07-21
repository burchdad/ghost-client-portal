# Gray Matters Launch Runbook

This runbook is for the first real Ghost Client Portal launch.

## Boundaries

- Do not create, cancel, expire, refund, or mutate Stripe objects during readiness review.
- Do not send invitations or external email until all blocking checks are clear.
- Do not seed fixture data into production.
- Do not run production migrations without explicit operator confirmation.

## Readiness Flow

1. Confirm production environment variables are set in Railway.
2. Apply the reviewed database migration only after a backup is available.
3. Record backup confirmation details before running `npm run migrate:production`.
4. Open the admin organization record and replace all placeholder client identity fields.
5. Invalidate the seeded/test acceptance unless Stephen explicitly approves preserving it.
6. Review the expired live Stripe Checkout Session and mark it abandoned internally.
7. Rotate proposal tokens only with explicit confirmation and copy the new link immediately.
8. Record the launch review checklist.
9. Create a reviewed invitation link only after the launch gate is `GO`.
10. Send the proposal or portal invitation manually outside this phase.

## Smoke Test

Run:

```bash
PRODUCTION_SMOKE_URL=https://clientportal.ghostai.solutions npm run smoke:production
```

The smoke test loads public/login/error-safe routes only. It does not submit forms or create Stripe Checkout Sessions.
