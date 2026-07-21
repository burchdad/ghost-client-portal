# Production Readiness

Production is ready only when:

- `APP_ENV=production` is explicit.
- `NEXT_PUBLIC_APP_URL` is the production portal URL and not localhost.
- `DATABASE_URL`, `AUTH_SECRET`, Stripe keys, webhook secret, and `EMAIL_FROM` are present.
- Stripe key modes match production.
- No placeholder client identity data remains.
- The database migration is applied intentionally.
- Admin launch readiness shows no `BLOCKED` checks.
- Existing Stripe Checkout Sessions have been reviewed read-only.
- Seeded/test acceptance has been invalidated or explicitly approved.
- A final launch review has been recorded as `GO`.
- Fake-client lifecycle testing uses `/admin/testing/client-lifecycle` and `PORTAL_TEST_CLIENT_EMAIL`, not Gray Matters records.
- Test lifecycle data is marked with `isTestRecord` and `testRunId`.

The application intentionally blocks production publishing and payment checkout when critical environment or placeholder checks fail.
